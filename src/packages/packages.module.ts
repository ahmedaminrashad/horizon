import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackagesService } from './packages.service';
import { PackagesController } from './packages.controller';
import { Package } from './entities/package.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Package]),
    UsersModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService, PermissionsGuard],
  exports: [PackagesService],
})
export class PackagesModule {}
