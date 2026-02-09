import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PatientQuestionAnswersService } from './patient-question-answers.service';
import { PatientQuestionAnswersController } from './patient-question-answers.controller';
import { DatabaseModule } from '../../database/database.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { UsersModule } from '../../users/users.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [
    DatabaseModule,
    ClinicsModule,
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [PatientQuestionAnswersController],
  providers: [
    PatientQuestionAnswersService,
    ClinicTenantGuard,
    ClinicPermissionsGuard,
  ],
  exports: [PatientQuestionAnswersService],
})
export class PatientQuestionAnswersModule {}
