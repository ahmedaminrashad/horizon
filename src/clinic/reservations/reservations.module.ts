import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { DoctorsModule as MainDoctorsModule } from '../../doctors/doctors.module';
import { ReservationsModule as MainReservationsModule } from '../../reservations/reservations.module';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
    ClinicsModule,
    MainDoctorsModule,
    MainReservationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, ClinicPermissionsGuard, ClinicTenantGuard],
  exports: [ReservationsService],
})
export class ReservationsModule {}
