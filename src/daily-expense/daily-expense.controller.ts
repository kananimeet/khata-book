import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { DailyExpenseService } from './daily-expense.service.js';
import { CreateDailyExpenseDto } from './dto/create-daily-expense.dto.js';
import { UpdateDailyExpenseDto } from './dto/update-daily-expense.dto.js';
import { QueryDailyExpenseDto } from './dto/query-daily-expense.dto.js';
import { QueryChartExpenseDto } from './dto/query-chart-expense.dto.js';
import {
  ApproveDailyExpenseDto,
  RejectDailyExpenseDto,
} from './dto/approve-reject-daily-expense.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../common/enums/role.enum.js';
import { dailyExpensePhotoUploadOptions } from '../helper/multer.helper.js';
import {
  DAILY_EXPENSE_CREATED_SUCCESS,
  DAILY_EXPENSE_UPDATED_SUCCESS,
  DAILY_EXPENSE_FETCHED_SUCCESS,
  DAILY_EXPENSES_FETCHED_SUCCESS,
  DAILY_EXPENSE_DELETED_SUCCESS,
  DAILY_EXPENSE_APPROVED_SUCCESS,
  DAILY_EXPENSE_REJECTED_SUCCESS,
  DAILY_EXPENSE_CHART_FETCHED_SUCCESS,
} from '../common/message.js';

@ApiTags('Daily Expenses & Grocery')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('daily-expenses')
export class DailyExpenseController {
  constructor(private readonly dailyExpenseService: DailyExpenseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('payment_photo', dailyExpensePhotoUploadOptions),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Create daily expense request (User or Admin)',
    description:
      "Users submit a daily expense (grocery, vegetables, etc.) with type 'room' or 'own'. Supports payment receipt upload via payment_photo.",
  })
  @ApiResponse({
    status: 201,
    description: 'Daily expense request created successfully',
  })
  async create(
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @Body() createDto: CreateDailyExpenseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createDto.payment_photo = `/uploads/daily-expenses/${file.filename}`;
    }

    const expense = await this.dailyExpenseService.create(
      currentUser.id,
      createDto,
      currentUser.role,
    );

    return {
      message: DAILY_EXPENSE_CREATED_SUCCESS,
      data: expense,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List daily expenses (User sees their own, Admin sees all)',
    description:
      "Regular users only see their own requests. Admins can see all users' expenses and filter by status, type ('room' vs 'own'), user, date.",
  })
  @ApiResponse({
    status: 200,
    description: 'Daily expenses fetched successfully',
  })
  async findAll(
    @Query() query: QueryDailyExpenseDto,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const result = await this.dailyExpenseService.findAll(query, currentUser);
    return {
      message: DAILY_EXPENSES_FETCHED_SUCCESS,
      data: result,
    };
  }

  @Get('chart')
  @ApiOperation({
    summary: 'Get daily and monthly expense chart & analytics data',
    description:
      'Provides daily trend for the selected month, monthly trend for the year, category breakdown, and KPI summary.',
  })
  @ApiResponse({
    status: 200,
    description: 'Chart data fetched successfully',
  })
  async getChartData(
    @Query() query: QueryChartExpenseDto,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const result = await this.dailyExpenseService.getChartData(
      query,
      currentUser,
    );
    return {
      message: DAILY_EXPENSE_CHART_FETCHED_SUCCESS,
      data: result,
    };
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Alias for /daily-expenses/chart',
  })
  async getAnalytics(
    @Query() query: QueryChartExpenseDto,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    return this.getChartData(query, currentUser);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single daily expense by ID',
    description:
      'Fetch full details of a daily expense. Regular users can only access their own.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Daily Expense ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily expense fetched successfully',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const expense = await this.dailyExpenseService.findById(id, currentUser);
    return {
      message: DAILY_EXPENSE_FETCHED_SUCCESS,
      data: expense,
    };
  }

  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('payment_photo', dailyExpensePhotoUploadOptions),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Edit daily expense (User can edit only if PENDING, Admin anytime)',
    description:
      'Normal users can edit their own expense only while status is PENDING. Admins can edit any expense.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Daily Expense ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily expense updated successfully',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @Body() updateDto: UpdateDailyExpenseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateDto.payment_photo = `/uploads/daily-expenses/${file.filename}`;
    }

    const expense = await this.dailyExpenseService.update(
      id,
      updateDto,
      currentUser,
    );

    return {
      message: DAILY_EXPENSE_UPDATED_SUCCESS,
      data: expense,
    };
  }

  @Put(':id')
  @UseInterceptors(
    FileInterceptor('payment_photo', dailyExpensePhotoUploadOptions),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Edit daily expense via PUT',
  })
  async updatePut(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @Body() updateDto: UpdateDailyExpenseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateDto.payment_photo = `/uploads/daily-expenses/${file.filename}`;
    }

    const expense = await this.dailyExpenseService.update(
      id,
      updateDto,
      currentUser,
    );

    return {
      message: DAILY_EXPENSE_UPDATED_SUCCESS,
      data: expense,
    };
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Approve daily expense request (Admin only)',
    description:
      "Admin approves the expense. If type is 'room', automatically decreases the user's room rent obligation.",
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Daily Expense ID to approve',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily expense approved successfully',
  })
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approveDto: ApproveDailyExpenseDto,
  ) {
    const expense = await this.dailyExpenseService.approve(id, approveDto);
    return {
      message: DAILY_EXPENSE_APPROVED_SUCCESS,
      data: expense,
    };
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reject daily expense request (Admin only)',
    description: 'Admin rejects the expense request with an optional note/reason.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Daily Expense ID to reject',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily expense rejected successfully',
  })
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rejectDto: RejectDailyExpenseDto,
  ) {
    const expense = await this.dailyExpenseService.reject(id, rejectDto);
    return {
      message: DAILY_EXPENSE_REJECTED_SUCCESS,
      data: expense,
    };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete daily expense (User if PENDING, Admin anytime)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Daily Expense ID to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Daily expense deleted successfully',
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    await this.dailyExpenseService.delete(id, currentUser);
    return {
      message: DAILY_EXPENSE_DELETED_SUCCESS,
      data: null,
    };
  }
}
