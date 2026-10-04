import * as pg from 'pg';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { User } from './user/entities/user.entity.js';
import { Expense } from './expense/entities/expense.entity.js';
import { ExpensePayment } from './expense/entities/expense-payment.entity.js';
import { Setting } from './setting/entities/setting.entity.js';
import { DailyExpense } from './daily-expense/entities/daily-expense.entity.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SeedModule } from './seed/seed.module.js';
import { ExpenseModule } from './expense/expense.module.js';
import { SettingModule } from './setting/setting.module.js';
import { DailyExpenseModule } from './daily-expense/daily-expense.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      driver: pg,
      ...(process.env.DATABASE_URL
        ? {
            url: process.env.DATABASE_URL.replace(
              /[&?]channel_binding=[^&]+/g,
              '',
            ).replace(/\?$/, ''),
          }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username:
              process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
          }),
      ssl:
        process.env.DB_SSL === 'true' ||
        Boolean(process.env.DATABASE_URL?.includes('sslmode=require')),
      extra: {
        ssl:
          process.env.DB_SSL === 'true' ||
          Boolean(process.env.DATABASE_URL?.includes('sslmode=require'))
            ? {
                rejectUnauthorized: false,
              }
            : false,
        connectionTimeoutMillis: 10000,
      },
      entities: [User, Expense, ExpensePayment, Setting, DailyExpense],
      synchronize: true, // false in production
    }),
    TypeOrmModule.forFeature([
      User,
      Expense,
      ExpensePayment,
      Setting,
      DailyExpense,
    ]),
    UserModule,
    AuthModule,
    SeedModule,
    ExpenseModule,
    SettingModule,
    DailyExpenseModule,
    ...(process.env.OBSERVE_APP_KEY &&
    process.env.OBSERVE_APP_KEY !== 'YOUR_APP_KEY'
      ? [
          ObserveModule.forRoot({
            appKey: process.env.OBSERVE_APP_KEY,
            appSecret: process.env.OBSERVE_APP_SECRET || '',
            serviceId: 'khata-book',
          }),
        ]
      : []),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
