import { Module } from '@nestjs/common';
import { TasksModule } from './tasks/tasks.module';
import { MpcModule } from './mcp/mcp.module';

@Module({
  imports: [TasksModule, MpcModule],
})
export class AppModule {}
