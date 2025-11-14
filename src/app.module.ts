import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // make .env available everywhere
      envFilePath: '.env', // load .env file from root
    }),
    DatabaseModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
