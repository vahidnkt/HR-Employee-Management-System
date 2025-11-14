import { Injectable, Inject } from '@nestjs/common';
import type { Repository } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { Users } from './users.entity';
import { UpdateUserDto } from './dto/update.user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('USERS_REPOSITORY')
    private usersRepository: Repository<Users>,
  ) {}

  async create(userData: any): Promise<Users> {
    return await this.usersRepository.create(userData);
  }

  async findByEmail(email: string): Promise<Users | null> {
    return await this.usersRepository.findOne({
      where: { email },
    });
  }

  async findById(id: string): Promise<Users | null> {
    return await this.usersRepository.findByPk(id);
  }

  async findAll(
    page: number = 1,
    take: number = 10,
    search?: string,
    role?: string,
    isActive?: boolean,
  ) {
    const offset = (page - 1) * take;
    const where: any = {};

    if (search) {
      where[Op.or] = [
        { userName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const { rows, count } = await this.usersRepository.findAndCountAll({
      where,
      limit: take,
      offset: offset,
      attributes: { exclude: ['password', 'refreshTokenHash'] },
      order: [['createdAt', 'DESC']],
    });

    return {
      items: rows,
      total: count,
      page: page,
      take: take,
    };
  }

  async update(id: string, updateData: UpdateUserDto): Promise<Users | null> {
    await this.usersRepository.update(updateData, {
      where: { id },
    });
    return await this.findById(id);
  }

  async updateRefreshToken(
    id: string,
    tokenHash: string | null,
  ): Promise<void> {
    const updateData: any = {};
    if (tokenHash !== null) {
      updateData.refreshTokenHash = tokenHash;
    } else {
      updateData.refreshTokenHash = null;
    }
    await this.usersRepository.update(updateData, {
      where: { id },
    });
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.destroy({
      where: { id },
    });
  }
}
