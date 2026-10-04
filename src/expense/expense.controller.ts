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
  ApiQuery,
} from '@nestjs/swagger';
import { ExpenseService } from './expense.service.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { QueryExpenseDto } from './dto/query-expense.dto.js';
import {
  ApproveExpenseDto,
  RejectExpenseDto,
} from './dto/approve-reject-expense.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  EXPENSE_CREATED_SUCCESS,
  EXPENSE_PAYMENT_CREATED_SUCCESS,
  EXPENSE_UPDATED_SUCCESS,
  EXPENSE_FETCHED_SUCCESS,
  EXPENSES_FETCHED_SUCCESS,
  EXPENSE_DELETED_SUCCESS,
  EXPENSE_APPROVED_SUCCESS,
  EXPENSE_REJECTED_SUCCESS,
  EXPENSE_TOTAL_LIST_FETCHED_SUCCESS,
} from '../common/message.js';

@ApiTags('Room Rate Money & Expenses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create expense / room rate payment request',
    description:
      'User creates an expense request (e.g., total = 6000, pay = 5000 or 6000, note = room pay). Status starts as PENDING until admin approves.',
  })
  @ApiResponse({
    status: 201,
    description: 'Expense request created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or pay_amount exceeds total_amount',
  })
  async create(
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @Body() createExpenseDto: CreateExpenseDto,
  ) {
    // If Admin provides a target user_id, assign the expense to that user
    const targetUserId =
      currentUser.role === UserRole.ADMIN &&
      (createExpenseDto.user_id || createExpenseDto.userId)
        ? (createExpenseDto.user_id || createExpenseDto.userId)!
        : currentUser.id;

    const expense = await this.expenseService.create(
      targetUserId,
      createExpenseDto,
      currentUser.role,
    );
    return {
      message: EXPENSE_CREATED_SUCCESS,
      data: expense,
    };
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit subsequent installment / remaining payment request',
    description:
      'User creates a second or subsequent payment request for remaining amount (e.g. remaining 1000). When approved, status becomes COMPLETE.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Expense ID to pay against',
  })
  @ApiResponse({
    status: 201,
    description: 'Payment request submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Amount exceeds remaining balance or expense already complete',
  })
  async createPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @Body() paymentDto: CreatePaymentDto,
  ) {
    const expense = await this.expenseService.createPayment(
      id,
      currentUser.id,
      paymentDto,
      currentUser.role === UserRole.ADMIN,
    );
    return {
      message: EXPENSE_PAYMENT_CREATED_SUCCESS,
      data: expense,
    };
  }

  @Get('totals/users')
  @ApiOperation({
    summary:
      'Get list of all users with requested amounts and approved total (Total List API)',
    description:
      'Lists all users who made amount requests. Approved total changes ONLY when admin approves (e.g. user req = 5000 status pending -> total = 0, admin approves -> total = 5000 status complete/remaining).',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filter users by name, email, or mobile',
  })
  @ApiResponse({
    status: 200,
    description: 'User totals list fetched successfully',
  })
  async getUserTotalsList(
    @CurrentUser() currentUser: { id: string; role: UserRole },
    @Query('search') search?: string,
  ) {
    const result = await this.expenseService.getUserTotalsList(
      currentUser,
      search,
    );
    return {
      message: EXPENSE_TOTAL_LIST_FETCHED_SUCCESS,
      data: result,
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List expenses / room rate requests',
    description:
      'Retrieve paginated list of expenses. All users (regular users and Admin) can view all expense requests with filter options and summary totals.',
  })
  @ApiResponse({
    status: 200,
    description: 'Expenses fetched successfully',
  })
  async findAll(
    @Query() query: QueryExpenseDto,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const result = await this.expenseService.findAll(query, currentUser);
    return {
      message: EXPENSES_FETCHED_SUCCESS,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get single expense details by ID',
    description:
      'Fetch full expense details including user information and payment history.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Expense ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense details fetched successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Expense not found',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const expense = await this.expenseService.findById(id, currentUser);
    return {
      message: EXPENSE_FETCHED_SUCCESS,
      data: expense,
    };
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Approve expense request (Admin only)',
    description:
      'Admin approves the pending request. Updates paid_amount and recalculates remaining_amount. If fully paid, status becomes COMPLETE, otherwise REMAINING.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Expense ID to approve',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense approved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Admin can approve',
  })
  async approveExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() approveDto: ApproveExpenseDto,
  ) {
    const expense = await this.expenseService.approveExpense(id, approveDto);
    return {
      message: EXPENSE_APPROVED_SUCCESS,
      data: expense,
    };
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reject expense request (Admin only)',
    description:
      'Admin rejects the pending expense request with an optional reason.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Expense ID to reject',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense rejected successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Admin can reject',
  })
  async rejectExpense(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rejectDto: RejectExpenseDto,
  ) {
    const expense = await this.expenseService.rejectExpense(id, rejectDto);
    return {
      message: EXPENSE_REJECTED_SUCCESS,
      data: expense,
    };
  }

  @Patch('payments/:paymentId/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Approve a specific installment payment (Admin only)',
  })
  @ApiParam({
    name: 'paymentId',
    type: 'string',
    format: 'uuid',
    description: 'Payment ID',
  })
  async approvePayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() approveDto: ApproveExpenseDto,
  ) {
    const expense = await this.expenseService.approvePayment(
      paymentId,
      approveDto,
    );
    return {
      message: EXPENSE_APPROVED_SUCCESS,
      data: expense,
    };
  }

  @Patch('payments/:paymentId/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Reject a specific installment payment (Admin only)',
  })
  @ApiParam({
    name: 'paymentId',
    type: 'string',
    format: 'uuid',
    description: 'Payment ID',
  })
  async rejectPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() rejectDto: RejectExpenseDto,
  ) {
    const expense = await this.expenseService.rejectPayment(
      paymentId,
      rejectDto,
    );
    return {
      message: EXPENSE_REJECTED_SUCCESS,
      data: expense,
    };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Edit / update expense (Admin only)',
    description:
      'Admin can update total amount, pay amount, paid amount, status, note, or remaining amount. Normal users cannot edit requests.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Expense ID to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense updated successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Users cannot edit expense requests. Only Admin can update.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const expense = await this.expenseService.update(
      id,
      updateExpenseDto,
      currentUser.role,
    );
    return {
      message: EXPENSE_UPDATED_SUCCESS,
      data: expense,
    };
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Edit / update expense via PUT (Admin only)',
  })
  async updatePut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @CurrentUser() currentUser: { id: string; role: UserRole },
  ) {
    const expense = await this.expenseService.update(
      id,
      updateExpenseDto,
      currentUser.role,
    );
    return {
      message: EXPENSE_UPDATED_SUCCESS,
      data: expense,
    };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete expense (Admin only)',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'Expense ID to delete',
  })
  @ApiResponse({
    status: 200,
    description: 'Expense deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Admin can delete',
  })
  async delete(@Param('id', ParseUUIDPipe) id: string) {
    await this.expenseService.delete(id);
    return {
      message: EXPENSE_DELETED_SUCCESS,
      data: null,
    };
  }
}
