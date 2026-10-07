import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserService } from './user.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateFcmTokenDto } from './dto/update-fcm-token.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UserRole } from '../common/enums/role.enum.js';
import { userProfilePictureUploadOptions } from '../helper/multer.helper.js';
import {
  USER_CREATED_SUCCESS,
  USER_UPDATED_SUCCESS,
  USERS_FETCHED_SUCCESS,
  USER_FETCHED_SUCCESS,
} from '../common/message.js';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('profile_picture', userProfilePictureUploadOptions),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Create user (Admin only with multipart/form-data)',
    description:
      'Creates a new user with form-data. Profile picture is uploaded as a file. Only ADMIN can access.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or invalid image file',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Only Admin can access this API',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - User with email or mobile already exists',
  })
  async create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      createUserDto.profile_picture = `/uploads/users/${file.filename}`;
    } else if (
      createUserDto.profile_picture === '' ||
      typeof createUserDto.profile_picture !== 'string'
    ) {
      createUserDto.profile_picture = undefined;
    }
    const user = await this.userService.create(createUserDto);
    return {
      message: USER_CREATED_SUCCESS,
      data: user,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.USER)
  @ApiOperation({
    summary: 'List users',
    description:
      'Retrieve a paginated list of users with optional filtering and search.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
  })
  async findAll(@Query() query: QueryUserDto) {
    const result = await this.userService.findAll(query);
    return {
      message: USERS_FETCHED_SUCCESS,
      data: result,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Retrieve details of a single user by their UUID.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User details retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.userService.getById(id);
    return {
      message: USER_FETCHED_SUCCESS,
      data: user,
    };
  }

  @Patch('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update current user FCM device token for push notifications',
    description:
      'Store or update the FCM web push token for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token updated successfully',
  })
  async updateFcmToken(
    @CurrentUser() currentUser: { id: string },
    @Body() dto: UpdateFcmTokenDto,
  ) {
    const user = await this.userService.updateFcmToken(
      currentUser.id,
      dto.fcm_token,
    );
    return {
      message: 'FCM token updated successfully',
      data: {
        id: user.id,
        fcm_token: user.fcm_token,
      },
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('profile_picture', userProfilePictureUploadOptions),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user (multipart/form-data)',
    description:
      'Update user details by ID with optional profile picture file upload.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or invalid file format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email or mobile already in use',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateUserDto.profile_picture = `/uploads/users/${file.filename}`;
    } else if (
      updateUserDto.profile_picture === '' ||
      typeof updateUserDto.profile_picture !== 'string'
    ) {
      updateUserDto.profile_picture = undefined;
    }
    const user = await this.userService.update(id, updateUserDto);
    return {
      message: USER_UPDATED_SUCCESS,
      data: user,
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('profile_picture', userProfilePictureUploadOptions),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update user (PUT with multipart/form-data)',
    description:
      'Update user details by ID with optional profile picture file upload.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or invalid file format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Email or mobile already in use',
  })
  async updatePut(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (file) {
      updateUserDto.profile_picture = `/uploads/users/${file.filename}`;
    } else if (
      updateUserDto.profile_picture === '' ||
      typeof updateUserDto.profile_picture !== 'string'
    ) {
      updateUserDto.profile_picture = undefined;
    }
    const user = await this.userService.update(id, updateUserDto);
    return {
      message: USER_UPDATED_SUCCESS,
      data: user,
    };
  }
}
