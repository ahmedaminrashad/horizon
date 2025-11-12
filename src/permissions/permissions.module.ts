import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsService } from './permissions.service';
import { PermissionsController } from './permissions.controller';
import { Permission } from './entities/permission.entity';
import { UsersModule } from '../users/users.module';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Permission]), UsersModule],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionsGuard],
  exports: [PermissionsService],
})
export class PermissionsModule {}
