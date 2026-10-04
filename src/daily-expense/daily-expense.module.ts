import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailyExpense } from './entities/daily-expense.entity.js';
import { User } from '../user/entities/user.entity.js';
import { DailyExpenseService } from './daily-expense.service.js';
import { DailyExpenseController } from './daily-expense.controller.js';
import { ExpenseModule } from '../expense/expense.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailyExpense, User]),
    ExpenseModule,
  ],
  controllers: [DailyExpenseController],
  providers: [DailyExpenseService],
  exports: [DailyExpenseService],
})
export class DailyExpenseModule {}
