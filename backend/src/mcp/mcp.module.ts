import { Module } from '@nestjs/common';
import { MpcService } from './mcp.service';
import { MpcController } from './mcp.controller';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TasksModule],
  providers: [MpcService],
  controllers: [MpcController],
})
export class MpcModule {}
