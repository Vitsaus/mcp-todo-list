import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { TasksService, Task } from '../tasks/tasks.service';

type AiAction = {
  action: 'create' | 'update' | 'toggle' | 'delete' | 'list' | 'message';
  id?: string | number | Array<string | number>;
  matchTitle?: string; // substring match against existing task title
  title?: string;
  done?: boolean;
  text?: string; // human-facing message when action === 'message'
};

@Injectable()
export class MpcService {
  private logger = new Logger(MpcService.name);

  constructor(private tasksService: TasksService) {}

  // New: support create/update/toggle/delete/list actions returned by the AI as JSON
  async createTasksFromAi(prompt: string) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // give the model the current tasks so it can reference them
    const currentTasks = this.tasksService.findAll().map((t) => ({ id: t.id, title: t.title, done: t.done }));

    const systemPrompt = `
You are a helpful assistant that receives a user's instruction about a todo list and MUST return ONLY a JSON array of action objects (no markdown, no explanation).

Each action object must have an 'action' field with one of: 'create', 'update', 'toggle', 'delete', 'list', 'message'.

Actions and their shapes (examples):

- create:
  { "action": "create", "title": "Buy milk" }

- update (single or multiple):
  { "action": "update", "id": 3, "title": "Buy almond milk", "done": false }
  { "action": "update", "id": [3,4], "done": true }
  { "action": "update", "matchTitle": "inbox", "done": true }

- toggle (single or multiple):
  { "action": "toggle", "id": 5 }
  { "action": "toggle", "id": [2,4,7] }
  { "action": "toggle", "matchTitle": "read" }

- delete (single or multiple):
  { "action": "delete", "id": 6 }
  { "action": "delete", "id": [2,3] }
  { "action": "delete", "matchTitle": "old" }

- list (return tasks to show to the user):
  { "action": "list" }                           // return all tasks
  { "action": "list", "id": [1,2] }           // return specific tasks by id
  { "action": "list", "matchTitle": "invoice" } // return tasks matching substring

- message (optional human text to show to user):
  { "action": "message", "text": "I created 3 tasks for organizing your desk." }

Rules:
- If providing ids, use task numeric ids shown in the "Current tasks" array.
- If referring to tasks by text, use matchTitle for substring matching.
- When targeting multiple tasks use an array for the id field.
- Respond with a JSON array only; each element must follow one of the action shapes above.
`;

    const userMessage = `Current tasks: ${JSON.stringify(currentTasks)}\n\nUser instruction: ${prompt}\n\nReturn a JSON array of actions.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 800,
    });

    // Use only message.content; the Choice type does not have a 'text' property
    const text = response.choices?.[0]?.message?.content || '';

    console.log("got open ai response", response, text)

    // Try to parse JSON robustly
    let actions: AiAction[] = [];
    try {
      actions = JSON.parse(text);
      if (!Array.isArray(actions)) throw new Error('AI did not return an array');
    } catch (e) {
      // attempt to extract first JSON array found in text
      try {
        const m = text.match(/\[([\s\S]*)\]/);
        if (m) actions = JSON.parse(m[0]);
        else throw e;
      } catch (err) {
        this.logger.error('Failed to parse AI response as JSON', err as any);
        // fallback: return raw text so the client can inspect
        return { error: 'Failed to parse AI response', raw: text } as any;
      }
    }

    const result = {
      created: [] as Task[],
      updated: [] as Task[],
      toggled: [] as Task[],
      deleted: [] as number[],
      listed: [] as Task[],
      message: '' as string,
    };

    for (const a of actions) {
      try {
        if (a.action === 'message' && a.text) {
          // collect message(s) from the AI
          result.message = result.message ? result.message + '\n' + a.text : a.text;
          continue;
        }
        // normalize ids to number[] when present
        const idList: number[] = [];
        if (a.id !== undefined && a.id !== null) {
          const collect = (raw: string | number) => {
            const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
            if (!Number.isNaN(n)) idList.push(n);
          };

          if (Array.isArray(a.id)) {
            for (const raw of a.id) {
              if (typeof raw === 'string' && (raw.includes(',') || /\s/.test(raw))) {
                for (const part of raw.split(/[,\s]+/)) {
                  if (part) collect(part);
                }
              } else {
                collect(raw as any);
              }
            }
          } else if (typeof a.id === 'string') {
            const s = a.id.trim();
            if (s.includes(',') || /\s/.test(s)) {
              for (const part of s.split(/[,\s]+/)) {
                if (part) collect(part);
              }
            } else {
              collect(s);
            }
          } else {
            collect(a.id as any);
          }
        }

        switch (a.action) {
          case 'list': {
            // list tasks matching ids or matchTitle; if no criteria, return all
            let matched: Task[] = [];

            const idProvided = a.id !== undefined && a.id !== null;
            const existingTasks = this.tasksService.findAll();
            const existingIdSet = new Set(existingTasks.map((t) => t.id));
            // only keep ids that correspond to actual tasks
            const validIds = idList.filter((id) => existingIdSet.has(id));

            if (idProvided) {
              // AI explicitly requested ids — return only those that exist (may be empty)
              matched = this.tasksService.findByIds(validIds);

              // warn if some requested ids were not found
              const missing = idList.filter((id) => !existingIdSet.has(id));
              if (missing.length) {
                const warn = `Warning: requested ids not found: ${missing.join(', ')}`;
                result.message = result.message ? result.message + '\n' + warn : warn;
              }
            } else if (a.matchTitle) {
              matched = existingTasks.filter((t) => t.title.includes(a.matchTitle!));
            } else {
              matched = existingTasks;
            }

            result.listed.push(...matched);
            break;
          }
           case 'create': {
             if (!a.title) break;
             const created = this.tasksService.create(a.title);
             result.created.push(created);
             break;
           }

           case 'update': {
             // support updating multiple ids
             if (idList.length) {
               for (const id of idList) {
                 const task = this.tasksService.findOne(id);
                 if (!task) continue;
                 const updated = this.tasksService.update(task.id, { title: a.title, done: a.done });
                 if (updated) result.updated.push(updated);
               }
             } else {
               let task: Task | undefined;
               if (a.matchTitle) task = this.tasksService.findAll().find((t) => t.title.includes(a.matchTitle!));
               if (!task) break;
               const updated = this.tasksService.update(task.id, { title: a.title, done: a.done });
               if (updated) result.updated.push(updated);
             }
             break;
           }

           case 'toggle': {
             if (idList.length) {
               for (const id of idList) {
                 const toggled = this.tasksService.toggle(id);
                 if (toggled) result.toggled.push(toggled);
               }
             } else {
               let task: Task | undefined;
               if (a.matchTitle) task = this.tasksService.findAll().find((t) => t.title.includes(a.matchTitle!));
               if (!task) break;
               const toggled = this.tasksService.toggle(task.id);
               if (toggled) result.toggled.push(toggled);
             }
             break;
           }

           case 'delete': {
             if (idList.length) {
               for (const id of idList) {
                 const task = this.tasksService.findOne(id);
                 if (!task) continue;
                 this.tasksService.delete(task.id);
                 result.deleted.push(task.id);
               }
             } else if (a.matchTitle) {
               // delete all tasks that match the title substring
               const matches = this.tasksService.findAll().filter((t) => t.title.includes(a.matchTitle!));
               for (const task of matches) {
                 this.tasksService.delete(task.id);
                 result.deleted.push(task.id);
               }
             }
             break;
           }

           default:
             this.logger.warn('Unknown action from AI: ' + (a as any).action);
         }
       } catch (err) {
         this.logger.error('Error applying action', err as any);
       }
     }

    // include the raw AI response text so clients can display or inspect it
    return { ...result, raw: text };
  }
}
