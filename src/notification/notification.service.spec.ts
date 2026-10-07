import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotificationService } from './notification.service.js';
import { NotificationType } from './entities/notification.entity.js';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockNotificationRepo: any;
  let mockUserRepo: any;
  let mockFirebaseService: any;

  beforeEach(() => {
    mockNotificationRepo = {
      find: vi.fn(),
      findOne: vi.fn(),
      create: vi.fn((data) => ({ id: 'notif-1', ...data })),
      save: vi.fn((data) => Promise.resolve(data)),
      update: vi.fn(() => Promise.resolve({ affected: 1 })),
      remove: vi.fn(() => Promise.resolve()),
      count: vi.fn(() => Promise.resolve(2)),
      createQueryBuilder: vi.fn(() => ({
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([
          [{ id: 'notif-1', title: 'Test', is_read: false }],
          1,
        ]),
      })),
    };

    mockUserRepo = {
      find: vi.fn().mockResolvedValue([
        { id: 'user-1', name: 'User One', fcm_token: 'token-1', is_active: true },
        { id: 'user-2', name: 'User Two', fcm_token: 'token-2', is_active: true },
        { id: 'user-3', name: 'User Three', fcm_token: null, is_active: true },
      ]),
      findOne: vi.fn().mockResolvedValue({
        id: 'user-1',
        name: 'User One',
        fcm_token: 'token-1',
        is_active: true,
      }),
      save: vi.fn((user) => Promise.resolve(user)),
      createQueryBuilder: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        execute: vi.fn().mockResolvedValue({ affected: 1 }),
      })),
    };

    mockFirebaseService = {
      sendMulticast: vi.fn().mockResolvedValue({
        successCount: 2,
        failureCount: 0,
        invalidTokens: [],
      }),
    };

    service = new NotificationService(
      mockNotificationRepo,
      mockUserRepo,
      mockFirebaseService,
    );
  });

  describe('sendNotificationToAllActiveUsers', () => {
    it('should query only active users, save in-app notifications, and send FCM multicast', async () => {
      await service.sendNotificationToAllActiveUsers({
        title: 'New Expense Request',
        body: 'User One submitted room rent',
        type: NotificationType.EXPENSE_REQUEST,
        data: { expense_id: 'exp-1' },
      });

      expect(mockUserRepo.find).toHaveBeenCalledWith({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          fcm_token: true,
        },
      });

      // Should save in-app notifications for all active users
      expect(mockNotificationRepo.save).toHaveBeenCalled();

      // Should send multicast push to non-empty tokens only (token-1 and token-2)
      expect(mockFirebaseService.sendMulticast).toHaveBeenCalledWith(
        ['token-1', 'token-2'],
        expect.objectContaining({
          title: 'New Expense Request',
          body: 'User One submitted room rent',
        }),
      );
    });

    it('should clean up invalid tokens if reported by Firebase', async () => {
      mockFirebaseService.sendMulticast.mockResolvedValueOnce({
        successCount: 1,
        failureCount: 1,
        invalidTokens: ['token-2'],
      });

      await service.sendNotificationToAllActiveUsers({
        title: 'Room Rent Approved',
        body: 'Approved by admin',
        type: NotificationType.EXPENSE_APPROVED,
      });

      expect(mockUserRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications and unread count', async () => {
      const result = await service.getUserNotifications('user-1', {
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(2);
    });
  });

  describe('updateFcmToken', () => {
    it('should update user fcm_token in users table', async () => {
      const updated = await service.updateFcmToken('user-1', 'new-device-token');

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
      expect(updated.fcm_token).toBe('new-device-token');
      expect(mockUserRepo.save).toHaveBeenCalled();
    });
  });

  describe('sendTestNotification', () => {
    it('should save notification and send push if user has token', async () => {
      const res = await service.sendTestNotification('user-1');

      expect(res.has_fcm_token).toBe(true);
      expect(mockFirebaseService.sendMulticast).toHaveBeenCalled();
      expect(mockNotificationRepo.save).toHaveBeenCalled();
    });
  });
});
