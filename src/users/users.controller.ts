import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update.user.dto';
import { UserQueryDto } from './dto/user.query';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getProfile() {
    // TODO: Get user from JWT token
    // For now, return placeholder
    return { message: 'Get profile - will implement with auth' };
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Body() updateUserDto: UpdateUserDto) {
    // TODO: Get user from JWT token
    // For now, return placeholder
    return { message: 'Update profile - will implement with auth' };
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async findAll(@Query() query: UserQueryDto) {
    const page = query.page || 1;
    const take = query.limit || 10;
    return await this.usersService.findAll(
      page,
      take,
      query.search,
      query.role,
      query.isActive,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      return { message: 'User not found' };
    }
    const { password, refreshTokenHash, ...userData } = user.toJSON();
    return userData;
  }
}
