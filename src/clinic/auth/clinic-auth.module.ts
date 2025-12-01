import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClinicAuthService } from './clinic-auth.service';
import { ClinicAuthController } from './clinic-auth.controller';
import { DatabaseModule } from '../../database/database.module';
import { UsersModule } from '../../users/users.module';
import { ClinicTenantGuard } from '../guards/clinic-tenant.guard';

@Module({
  imports: [
    DatabaseModule,
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
  controllers: [ClinicAuthController],
  providers: [ClinicAuthService, ClinicTenantGuard],
  exports: [ClinicAuthService],
})
export class ClinicAuthModule {}
