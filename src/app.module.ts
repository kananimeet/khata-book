import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { User } from './user/entities/user.entity.js';
import { UserModule } from './user/user.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SeedModule } from './seed/seed.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      ...(process.env.DATABASE_URL
        ? {
            url: process.env.DATABASE_URL,
          }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '5432', 10),
            username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
          }),
      ssl:
        process.env.DB_SSL === 'true' ||
        (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('sslmode=require'))
          ? { rejectUnauthorized: false }
          : false,
      entities: [User],
      synchronize: true, // false in production
    }),
    TypeOrmModule.forFeature([User]),
    UserModule,
    AuthModule,
    SeedModule,
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'khata-book',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
