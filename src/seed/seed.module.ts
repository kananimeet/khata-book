import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity.js';
import { SeedsService } from './seeds.service.js';
import { SeedController } from './seed.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [SeedController],
  providers: [SeedsService],
  exports: [SeedsService],
})
export class SeedModule {}
