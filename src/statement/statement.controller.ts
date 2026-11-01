import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { StatementService } from './statement.service.js';
import { QueryStatementDto } from './dto/query-statement.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Account Statement & Ledger')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statement')
export class StatementController {
  constructor(private readonly statementService: StatementService) {}

  @Get()
  @ApiOperation({
    summary:
      'Get complete room passbook/statement with credits, debits, running balance, and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Statement fetched successfully with running balance',
  })
  async getStatement(@Query() query: QueryStatementDto) {
    const data = await this.statementService.getStatement(query);
    return {
      message: 'Statement records fetched successfully',
      data,
    };
  }
}

