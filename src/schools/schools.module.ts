import { Module } from '@nestjs/common';
import { DatabaseModule } from '../db/database.module';
import { SchoolsService } from './schools.service';
import { SchoolsController } from './schools.controller';
import { schoolsProviders } from './schools.provider';

@Module({
  imports: [DatabaseModule],
  providers: [SchoolsService, ...schoolsProviders],
  controllers: [SchoolsController],
  exports: [SchoolsService],
})
export class SchoolsModule {}
