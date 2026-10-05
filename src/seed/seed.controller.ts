import {
  Controller,
  Post,
  Query,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SeedsService } from './seeds.service.js';

@ApiTags('Seed')
@Controller('seed')
export class SeedController {
  constructor(private readonly seedsService: SeedsService) {}

  @Post('run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run database seed to create default admin' })
  @ApiQuery({
    name: 'secret',
    required: false,
    description: 'Optional secret key (set via SEED_SECRET env variable)',
  })
  @ApiResponse({ status: 200, description: 'Seed executed successfully' })
  async runSeed(@Query('secret') secret?: string) {
    if (process.env.SEED_SECRET && secret !== process.env.SEED_SECRET) {
      throw new UnauthorizedException('Invalid secret key');
    }

    await this.seedsService.seedAll();

    return {
      statusCode: 200,
      message: 'Database seed executed successfully',
    };
  }
}
