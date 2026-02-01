import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QuestionSetsService } from './question-sets.service';
import { QuestionSetsController } from './question-sets.controller';
import { QuestionSet } from './entities/question-set.entity';
import { Question } from './entities/question.entity';
import { QuestionSetAssignment } from './entities/question-set-assignment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Service } from '../services/entities/service.entity';
import { Branch } from '../branches/entities/branch.entity';
import { DatabaseModule } from '../../database/database.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      QuestionSet,
      Question,
      QuestionSetAssignment,
      Doctor,
      Service,
      Branch,
    ]),
    DatabaseModule,
    ClinicsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [QuestionSetsController],
  providers: [QuestionSetsService, ClinicTenantGuard, ClinicPermissionsGuard],
  exports: [QuestionSetsService],
})
export class QuestionSetsModule {}
