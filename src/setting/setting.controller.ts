import {
  Controller,
  Get,
  Patch,
  Put,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SettingService } from './setting.service.js';
import { UpdateSettingDto } from './dto/update-setting.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/role.enum.js';
import {
  SETTING_FETCHED_SUCCESS,
  SETTING_UPDATED_SUCCESS,
} from '../common/message.js';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingController {
  constructor(private readonly settingService: SettingService) {}

  @Get()
  @ApiOperation({
    summary: 'Get system settings (e.g. default expense total_amount)',
    description:
      'Fetches current application settings. Accessible by both normal users and Admin to pre-fill default values.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings fetched successfully',
  })
  async getSetting() {
    const setting = await this.settingService.getSetting();
    return {
      message: SETTING_FETCHED_SUCCESS,
      data: setting,
    };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update system settings (Admin only)',
    description:
      'Admin updates system settings such as default total_amount for room rate/expenses. Only Admin has permission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Admin can update settings',
  })
  async update(@Body() updateDto: UpdateSettingDto) {
    const setting = await this.settingService.update(updateDto);
    return {
      message: SETTING_UPDATED_SUCCESS,
      data: setting,
    };
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update system settings via PUT (Admin only)',
  })
  async updatePut(@Body() updateDto: UpdateSettingDto) {
    const setting = await this.settingService.update(updateDto);
    return {
      message: SETTING_UPDATED_SUCCESS,
      data: setting,
    };
  }
}
