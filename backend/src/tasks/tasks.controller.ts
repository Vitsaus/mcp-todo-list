import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { TasksService, Task } from './tasks.service';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findAll(): Task[] {
    return this.tasksService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Task {
    const task = this.tasksService.findOne(Number(id));
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
