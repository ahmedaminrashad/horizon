import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkingHoursService } from './working-hours.service';
import { WorkingHoursController } from './working-hours.controller';
import { DatabaseModule } from '../../database/database.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { ClinicWorkingHour } from '../../clinics/entities/clinic-working-hour.entity';

@Module({
  imports: [
    DatabaseModule,
    ClinicsModule,
    TypeOrmModule.forFeature([ClinicWorkingHour]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [WorkingHoursController],
  providers: [WorkingHoursService, ClinicTenantGuard, ClinicPermissionsGuard],
  exports: [WorkingHoursService],
})
export class WorkingHoursModule {}

