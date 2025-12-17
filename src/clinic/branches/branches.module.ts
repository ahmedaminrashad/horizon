import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BranchesService } from './branches.service';
import { BranchesController } from './branches.controller';
import { BranchesModule as MainBranchesModule } from '../../branches/branches.module';
import { DatabaseModule } from '../../database/database.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [
    MainBranchesModule,
    DatabaseModule,
    ClinicsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [BranchesController],
  providers: [BranchesService, ClinicTenantGuard, ClinicPermissionsGuard],
  exports: [BranchesService],
})
export class BranchesModule {}
