import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ClinicsModule } from '../../clinics/clinics.module';
import { DoctorsModule } from '../doctors/doctors.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { ClinicUsersModule } from '../users/clinic-users.module';

@Module({
  imports: [
    ClinicsModule,
    DoctorsModule,
    ReservationsModule,
    ClinicUsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
