import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Schools } from './schools.entity';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolResponseDto } from './dto/school-response.dto';

@Injectable()
export class SchoolsService {
  constructor(
    @Inject('SCHOOLS_REPOSITORY')
    private readonly schoolsRepository: typeof Schools,
  ) {}

  async create(
    createSchoolDto: CreateSchoolDto,
    adminId: string,
  ): Promise<SchoolResponseDto> {
    const school = await this.schoolsRepository.create({
      ...createSchoolDto,
      adminId,
    });

    return this.toResponseDto(school);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<any> {
    const offset = (page - 1) * limit;

    const { count, rows } = await this.schoolsRepository.findAndCountAll({
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    return {
      data: rows.map((school) => this.toResponseDto(school)),
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    };
  }

  async findById(id: string): Promise<SchoolResponseDto> {
    const school = await this.schoolsRepository.findByPk(id);

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return this.toResponseDto(school);
  }

  async update(
    id: string,
    updateSchoolDto: UpdateSchoolDto,
    adminId: string,
  ): Promise<SchoolResponseDto> {
    const school = await this.schoolsRepository.findByPk(id);

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Only admin of the school can update it
    if (school.adminId !== adminId) {
      throw new ForbiddenException(
        'You do not have permission to update this school',
      );
    }

    await school.update(updateSchoolDto);

    return this.toResponseDto(school);
  }

  async delete(id: string, adminId: string): Promise<void> {
    const school = await this.schoolsRepository.findByPk(id);

    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Only admin of the school can delete it
    if (school.adminId !== adminId) {
      throw new ForbiddenException(
        'You do not have permission to delete this school',
      );
    }

    await school.destroy();
  }

  async findByAdmin(adminId: string, page: number = 1, limit: number = 10): Promise<any> {
    const offset = (page - 1) * limit;

    const { count, rows } = await this.schoolsRepository.findAndCountAll({
      where: { adminId },
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    return {
      data: rows.map((school) => this.toResponseDto(school)),
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    };
  }

  private toResponseDto(school: Schools): SchoolResponseDto {
    return {
      id: school.id,
      name: school.name,
      description: school.description,
      adminId: school.adminId,
      logo: school.logo,
      banner: school.banner,
      address: school.address,
      phone: school.phone,
      email: school.email,
      totalClasses: school.totalClasses,
      totalStudents: school.totalStudents,
      isActive: school.isActive,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    };
  }
}
