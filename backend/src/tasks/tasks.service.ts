import { Injectable } from '@nestjs/common';

export type Task = {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
};

@Injectable()
export class TasksService {
  private tasks: Task[] = [];
  // numeric auto-incrementing id
  private nextId = 1;

  findAll(): Task[] {
    return this.tasks;
  }

  findOne(id: number): Task | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  // New: return only tasks that match the provided numeric ids (preserves order of stored tasks)
  findByIds(ids: number[]): Task[] {
    const idSet = new Set(ids.filter((n) => Number.isFinite(n)));
    return this.tasks.filter((t) => idSet.has(t.id));
  }

  create(title: string): Task {
    const task: Task = {
      id: this.nextId++,
      title,
      done: false,
      createdAt: new Date().toISOString(),
    };
    this.tasks.unshift(task);
    return task;
  }

  update(id: number, attrs: Partial<Pick<Task, 'title' | 'done'>>): Task | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (!task) return undefined;
    if (attrs.title !== undefined) task.title = attrs.title;
    if (attrs.done !== undefined) task.done = attrs.done;
    return task;
  }

  toggle(id: number): Task | undefined {
    const task = this.tasks.find((t) => t.id === id);
    if (task) task.done = !task.done;
    return task;
  }

  delete(id: number) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }
}
