import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Users } from './users.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('USERS_REPOSITORY')
    private readonly usersRepository: typeof Users,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    // Check if user already exists
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      parseInt(process.env.BCRYPT_ROUNDS || '10'),
    );

    // Create user
    const user = await this.usersRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    return this.toResponseDto(user);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<any> {
    const offset = (page - 1) * limit;

    const { count, rows } = await this.usersRepository.findAndCountAll({
      offset,
      limit,
      order: [['createdAt', 'DESC']],
    });

    return {
      data: rows.map((user) => this.toResponseDto(user)),
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit),
    };
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findByPk(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<Users | null> {
    const user = await this.usersRepository.findOne({
      where: { email },
    });

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.usersRepository.findByPk(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await user.update(updateUserDto);

    return this.toResponseDto(user);
  }

  async delete(id: string): Promise<void> {
    const user = await this.usersRepository.findByPk(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await user.destroy();
  }

  private toResponseDto(user: Users): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      whatsappNumber: user.whatsappNumber,
      avatar: user.avatar,
      bio: user.bio,
      role: user.role,
      isActive: user.isActive,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
