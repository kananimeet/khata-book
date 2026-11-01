import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatementController } from './statement.controller.js';
import { StatementService } from './statement.service.js';
import { ExpensePayment } from '../expense/entities/expense-payment.entity.js';
import { Expense } from '../expense/entities/expense.entity.js';
import { DailyExpense } from '../daily-expense/entities/daily-expense.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExpensePayment, Expense, DailyExpense]),
  ],
  controllers: [StatementController],
  providers: [StatementService],
  exports: [StatementService],
})
export class StatementModule {}

