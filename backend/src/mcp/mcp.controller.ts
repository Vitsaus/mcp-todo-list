import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { MpcService } from './mcp.service';
import { Request } from 'express';

@Controller('mcp')
export class MpcController {
  constructor(private readonly mpcService: MpcService) {}

  @Post('create')
  async create(@Body('prompt') prompt: string) {
    const result = await this.mpcService.createTasksFromAi(prompt);
    // Provide a plain assistant string for clients that expect text
    const assistant = (result && (result as any).message)
      ? (result as any).message
      : (result && (result as any).raw ? String((result as any).raw) : '');
    return { ...result, assistant };
  }

  @Get('config/mcp.json')
  async config(@Req() req: Request) {
    // Build base URL from incoming request so clients can use the returned config
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3001';
    const baseUrl = `${protocol}://${host}`;

    const config = {
      servers: {
        'local-mcp-server': {
          url: baseUrl,
          type: 'http',
        },
      },
      inputs: [
        // Create
        {
          id: 'create-single',
          label: 'MCP: Create a task',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Create a task titled "Buy milk"' },
        },
        {
          id: 'create-multiple',
          label: 'MCP: Create multiple tasks',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Create three tasks: Buy milk; Clean the desk; Email John' },
        },

        // Update
        {
          id: 'update-single-id',
          label: 'MCP: Update a task by id',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Update task 3: set title to "Buy almond milk" and mark not done' },
        },
        {
          id: 'update-multiple-ids',
          label: 'MCP: Update multiple tasks by ids',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Update tasks [3,4]: set done = true' },
        },
        {
          id: 'update-matchTitle',
          label: 'MCP: Update tasks by matchTitle',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Mark all tasks with "inbox" in the title as done' },
        },

        // Toggle
        {
          id: 'toggle-single',
          label: 'MCP: Toggle a task',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Toggle task 5' },
        },
        {
          id: 'toggle-multiple',
          label: 'MCP: Toggle multiple tasks',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Toggle tasks [2,4,7]' },
        },
        {
          id: 'toggle-matchTitle',
          label: 'MCP: Toggle tasks by matchTitle',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Toggle tasks with "read" in the title' },
        },

        // Delete
        {
          id: 'delete-single',
          label: 'MCP: Delete a task',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Delete task 6' },
        },
        {
          id: 'delete-multiple',
          label: 'MCP: Delete multiple tasks',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Delete tasks [2,3]' },
        },
        {
          id: 'delete-matchTitle',
          label: 'MCP: Delete by matchTitle',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Delete tasks with "old" in the title' },
        },

        // List
        {
          id: 'list-all',
          label: 'MCP: List all tasks',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'List all tasks' },
        },
        {
          id: 'list-ids',
          label: 'MCP: List specific ids',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'List tasks with id: [3,4]' },
        },
        {
          id: 'list-matchTitle',
          label: 'MCP: List by matchTitle',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'List tasks matching "invoice"' },
        },

        // Message only
        {
          id: 'message-only',
          label: 'MCP: Message (no changes)',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Do not change tasks. Respond with a short message explaining the current state.' },
        },

        // Combined example
        {
          id: 'create-and-message',
          label: 'MCP: Create tasks and include message',
          method: 'POST',
          path: '/mcp/create',
          body: { prompt: 'Create 2 tasks: Buy coffee and Write report. Also return a short message describing what you did.' },
        },
      ],
    };

    return config;
  }
}

