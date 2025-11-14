import { Inject } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { Users } from './users.entity';

export const usersProvider = [
  {
    provide: 'USERS_REPOSITORY',
    useFactory: (sequelize: Sequelize) => sequelize.getRepository(Users),
    inject: ['SEQUELIZE'],
  },
];
