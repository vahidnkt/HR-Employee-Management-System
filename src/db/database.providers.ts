import { Sequelize } from 'sequelize-typescript';
import { Dialect } from 'sequelize';
import { Users } from '../users/users.entity';
export const databaseProviders = [
  {
    provide: 'SEQUELIZE',
    useFactory: async () => {
      const sequelize = new Sequelize({
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USER_NAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        logging: false,
        pool: {
          max: 5,
          min: 0,
          acquire: 30000,
          idle: 10000,
        },
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
        },
      });
      sequelize.addModels([Users]);
      await sequelize.sync();
      return sequelize;
    },
  },
];
