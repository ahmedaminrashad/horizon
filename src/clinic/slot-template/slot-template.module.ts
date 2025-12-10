import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SlotTemplateService } from './slot-template.service';
import { SlotTemplateController } from './slot-template.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { ClinicsModule } from '../../clinics/clinics.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';
import { ClinicPermissionsGuard } from '../guards/clinic-permissions.guard';

@Module({
  imports: [
    DatabaseModule,
    UsersModule,
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
  controllers: [SlotTemplateController],
  providers: [SlotTemplateService, ClinicTenantGuard, ClinicPermissionsGuard],
  exports: [SlotTemplateService],
})
export class SlotTemplateModule {}
