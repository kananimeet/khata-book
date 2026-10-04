import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Expense } from './entities/expense.entity.js';
import { ExpensePayment } from './entities/expense-payment.entity.js';
import { User } from '../user/entities/user.entity.js';
import { ExpenseService } from './expense.service.js';
import { ExpenseController } from './expense.controller.js';
import { SettingModule } from '../setting/setting.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Expense, ExpensePayment, User]),
    SettingModule,
  ],
  controllers: [ExpenseController],
  providers: [ExpenseService],
  exports: [ExpenseService],
})
export class ExpenseModule {}
