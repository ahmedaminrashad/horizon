import { Module } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ClinicPermissionsGuard],
  exports: [ReservationsService],
})
export class ReservationsModule {}
