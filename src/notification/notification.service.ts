import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity.js';
import { User } from '../user/entities/user.entity.js';
import { FirebaseService } from './firebase.service.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';

export interface SendAllActiveUsersPayload {
  title: string;
  body: string;
  type: NotificationType;
  data?: Record<string, any>;
  link?: string;
  excludeUserId?: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly firebaseService: FirebaseService,
  ) {}

  /**
   * Send notification to all ACTIVE users saved in the user table.
   * 1. Stores in-app notification in the notifications table for all active users.
   * 2. Sends FCM Web Push notification to all active users with registered tokens.
   * Web push displays even when website is closed/inactive.
   */
  async sendNotificationToAllActiveUsers(payload: SendAllActiveUsersPayload): Promise<void> {
    try {
      // Query ONLY active users stored in users table
      const activeUsers = await this.userRepository.find({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          fcm_token: true,
        },
      });

      if (!activeUsers || activeUsers.length === 0) {
        this.logger.log('No active users found to notify.');
        return;
      }

      const targetUsers = payload.excludeUserId
        ? activeUsers.filter((u) => u.id !== payload.excludeUserId)
        : activeUsers;

      if (targetUsers.length === 0) {
        return;
      }

      // 1. Save in-app notification for each active user
      const entities = targetUsers.map((user) =>
        this.notificationRepository.create({
          user_id: user.id,
          title: payload.title,
          message: payload.body,
          type: payload.type,
          data: payload.data,
          is_read: false,
        }),
      );

      await this.notificationRepository.save(entities);

      // 2. Collect FCM tokens from active users for Web Push
      const tokens = targetUsers
        .map((u) => u.fcm_token)
        .filter((t): t is string => Boolean(t && t.trim().length > 0));

      if (tokens.length > 0) {
        const pushResult = await this.firebaseService.sendMulticast(tokens, {
          title: payload.title,
          body: payload.body,
          data: payload.data,
          link: payload.link || '/',
        });

        // Clean up invalid or expired tokens automatically
        if (pushResult.invalidTokens && pushResult.invalidTokens.length > 0) {
          try {
            await this.userRepository
              .createQueryBuilder()
              .update(User)
              .set({ fcm_token: null as any })
              .where('fcm_token IN (:...invalidTokens)', {
                invalidTokens: pushResult.invalidTokens,
              })
              .execute();
            this.logger.log(
              `Cleaned up ${pushResult.invalidTokens.length} expired FCM token(s).`,
            );
          } catch (cleanErr: any) {
            this.logger.warn(`Failed to clean up dead tokens: ${cleanErr?.message}`);
          }
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Failed to send notification to all active users: ${err?.message}`,
        err?.stack,
      );
    }
  }

  /**
   * Get paginated notifications for current user with unread count
   */
  async getUserNotifications(userId: string, query: QueryNotificationDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const qb = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId });

    if (query.is_read !== undefined) {
      qb.andWhere('notification.is_read = :isRead', { isRead: query.is_read });
    }

    qb.orderBy('notification.created_at', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    const unreadCount = await this.notificationRepository.count({
      where: { user_id: userId, is_read: false },
    });

    return {
      items,
      total,
      unreadCount,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.is_read = true;
    return this.notificationRepository.save(notification);
  }

  /**
   * Mark all notifications as read for current user
   */
  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationRepository.update(
      { user_id: userId, is_read: false },
      { is_read: true },
    );
    return { affected: result.affected || 0 };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, user_id: userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.notificationRepository.remove(notification);
  }

  /**
   * Update or store user FCM token in user table
   */
  async updateFcmToken(userId: string, fcmToken: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    user.fcm_token = fcmToken;
    return this.userRepository.save(user);
  }

  /**
   * Helper method to test FCM Web Push delivery for current user or verify configuration
   */
  async sendTestNotification(
    userId: string,
    customTitle?: string,
    customBody?: string,
  ) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const title = customTitle || 'Khata Book Push Test';
    const body =
      customBody ||
      `Hello ${user.name}, push notifications are working! Web off hone par bhi aayegi.`;

    // 1. Save in-app notification
    const entity = this.notificationRepository.create({
      user_id: user.id,
      title,
      message: body,
      type: NotificationType.GENERAL,
      data: { test: true, timestamp: new Date().toISOString() },
      is_read: false,
    });
    const savedNotification = await this.notificationRepository.save(entity);

    // 2. Send push if token exists
    let pushResult = null;
    if (user.fcm_token) {
      pushResult = await this.firebaseService.sendMulticast([user.fcm_token], {
        title,
        body,
        data: { test: 'true' },
        link: '/',
      });
    }

    return {
      message: user.fcm_token
        ? 'Test notification triggered and sent via FCM!'
        : 'Notification saved in DB, but user has no fcm_token saved yet.',
      has_fcm_token: Boolean(user.fcm_token),
      fcm_token: user.fcm_token ? `${user.fcm_token.slice(0, 15)}...` : null,
      push_result: pushResult,
      notification: savedNotification,
    };
  }
}
