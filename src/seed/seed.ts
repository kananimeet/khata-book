import 'dotenv/config';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NestFactory } from '@nestjs/core';
import { User } from '../user/entities/user.entity.js';
import { SeedModule } from './seed.module.js';
import { SeedsService } from './seeds.service.js';
import { SEED_FAILED } from '../common/message.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [User],
      synchronize: true,
    }),
    SeedModule,
  ],
})
class SeedContextModule {}

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(SeedContextModule, {
      logger: ['error', 'warn', 'log'],
    });

    const seedsService = app.get(SeedsService);
    await seedsService.seedAll();

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error(SEED_FAILED, error);
    process.exit(1);
  }
}

bootstrap();
