import { Module } from '@nestjs/common';
import { ClinicUsersService } from './clinic-users.service';
import { ClinicUsersController } from './clinic-users.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [DatabaseModule, UsersModule],
  controllers: [ClinicUsersController],
  providers: [ClinicUsersService, ClinicPermissionsGuard],
  exports: [ClinicUsersService],
})
export class ClinicUsersModule {}
