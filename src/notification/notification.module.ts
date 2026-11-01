import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity.js';
import { User } from '../user/entities/user.entity.js';
import { FirebaseService } from './firebase.service.js';
import { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationController],
  providers: [FirebaseService, NotificationService],
  exports: [NotificationService, FirebaseService],
})
export class NotificationModule {}
