import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { NotificationService } from './notification.service.js';
import { QueryNotificationDto } from './dto/query-notification.dto.js';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({
    summary: 'Get notifications for current user',
    description:
      'Retrieve paginated notifications with unread count for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async findAll(
    @CurrentUser() user: { id: string },
    @Query() query: QueryNotificationDto,
  ) {
    const result = await this.notificationService.getUserNotifications(
      user.id,
      query,
    );
    return {
      message: 'Notifications fetched successfully',
      data: result,
    };
  }

  @Post('fcm-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Save or update user FCM device token',
    description:
      'Store FCM token in user table to enable Web Push notifications when web is open or closed.',
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token saved successfully',
  })
  async saveFcmToken(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateFcmTokenDto,
  ) {
    const updated = await this.notificationService.updateFcmToken(
      user.id,
      dto.fcm_token,
    );
    return {
      message: 'FCM device token registered successfully',
      data: { id: updated.id, fcm_token: updated.fcm_token },
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a test push notification to current user',
    description:
      'Tests Web Push delivery to the current user token and saves an in-app notification.',
  })
  async testPush(
    @CurrentUser() user: { id: string },
    @Body() body?: { title?: string; body?: string },
  ) {
    const result = await this.notificationService.sendTestNotification(
      user.id,
      body?.title,
      body?.body,
    );
    return {
      message: 'Test notification executed',
      data: result,
    };
  }

  @Patch('read-all')
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: 'Mark all unread notifications of the current user as read.',
  })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@CurrentUser() user: { id: string }) {
    const result = await this.notificationService.markAllAsRead(user.id);
    return {
      message: 'All notifications marked as read',
      data: result,
    };
  }

  @Patch(':id/read')
  @ApiOperation({
    summary: 'Mark single notification as read',
    description: 'Mark a specific notification as read by its UUID.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification marked as read',
  })
  async markAsRead(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const notification = await this.notificationService.markAsRead(
      user.id,
      id,
    );
    return {
      message: 'Notification marked as read',
      data: notification,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete notification',
    description: 'Permanently remove a notification for current user.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Notification ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Notification deleted successfully',
  })
  async delete(
    @CurrentUser() user: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.notificationService.deleteNotification(user.id, id);
    return {
      message: 'Notification deleted successfully',
    };
  }
}
