import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { SchoolsService } from './schools.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('schools')
export class SchoolsController {
  constructor(private readonly schoolsService: SchoolsService) {}

  @Post()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(201)
  async create(
    @Body() createSchoolDto: CreateSchoolDto,
    @Request() req: any,
  ) {
    const adminId = req.user.sub;
    return this.schoolsService.create(createSchoolDto, adminId);
  }

  @Get()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin')
  async findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.schoolsService.findAll(page, limit);
  }

  @Get('my-schools')
  @UseGuards(JwtGuard)
  async getMySchools(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    const adminId = req.user.sub;
    return this.schoolsService.findByAdmin(adminId, page, limit);
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string) {
    return this.schoolsService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtGuard)
  async update(
    @Param('id') id: string,
    @Body() updateSchoolDto: UpdateSchoolDto,
    @Request() req: any,
  ) {
    const adminId = req.user.sub;
    return this.schoolsService.update(id, updateSchoolDto, adminId);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  async delete(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user.sub;
    await this.schoolsService.delete(id, adminId);
    return { message: 'School deleted successfully' };
  }
}
