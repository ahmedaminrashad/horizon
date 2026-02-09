import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { TenantContextService } from '../../database/tenant-context.service';
import { TenantDataSourceService } from '../../database/tenant-data-source.service';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { User as ClinicUser } from '../../clinic/permissions/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private tenantContextService: TenantContextService,
    private tenantDataSourceService: TenantDataSourceService,
    private tenantRepositoryService: TenantRepositoryService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key'),
      passReqToCallback: true, // Enable access to request object
    });
  }

  async validate(request: any, payload: any) {
    // Patient question answers: always use main JWT (main app login), not clinic JWT
    const path = request?.url || request?.path || '';
    const isAnswersRoute = String(path).includes('patient-question-answers');
    if (isAnswersRoute) {
      const user = await this.usersService.findOne(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return {
        userId: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role_id: user.role_id,
        role_slug: user.role?.slug,
        isMainUser: true,
      };
    }

    // Check if this is a clinic route (has clinicId in params or token has clinic_id)
    const clinicId = request?.params?.clinicId || payload.clinic_id;
    const isClinicRoute = !!clinicId || !!payload.database_name;

    // If it's a clinic route, validate user from clinic database
    if (isClinicRoute) {
      // Get the tenant database name from context (set by ClinicTenantGuard) or from token
      let tenantDatabase = this.tenantContextService.getTenantDatabase();
      
      // If context not set but token has database_name, use it
      if (!tenantDatabase && payload.database_name) {
        tenantDatabase = payload.database_name;
        // Set it in context for this request (only if it's a valid string)
        if (tenantDatabase) {
          this.tenantContextService.setTenantDatabase(tenantDatabase);
        }
      }

      if (!tenantDatabase) {
        throw new UnauthorizedException(
          'Tenant database context not set. Please ensure ClinicTenantGuard runs before JWT authentication.',
        );
      }

      // Verify tenant DataSource is initialized and accessible
      const tenantDataSource =
        await this.tenantDataSourceService.getTenantDataSource(tenantDatabase);

      if (!tenantDataSource) {
        throw new UnauthorizedException(
          `Failed to connect to tenant database "${tenantDatabase}". Please ensure the database exists and is accessible.`,
        );
      }

      // If token has database_name, validate it matches the route
      if (payload.database_name && payload.database_name !== tenantDatabase) {
        throw new UnauthorizedException(
          'Token database_name does not match route clinic database.',
        );
      }

      // If route has clinicId and token has clinic_id, validate they match
      if (request?.params?.clinicId && payload.clinic_id && payload.clinic_id !== +request.params.clinicId) {
        console.log('Token clinic_id does not match route clinicId.', {
          tokenClinicId: payload.clinic_id,
          routeClinicId: request.params.clinicId,
        });
        throw new UnauthorizedException(
          'Token clinic_id does not match route clinicId.',
        );
      }

      // Validate user from clinic database (payload.sub may be clinic user ID or main user ID)
      const userRepository =
        await this.tenantRepositoryService.getRepository<ClinicUser>(
          ClinicUser,
        );
      const clinicUser = await userRepository.findOne({
        where: { id: payload.sub },
        relations: ['role', 'role.permissions'],
      });

      if (clinicUser) {
        return {
          userId: clinicUser.id,
          name: clinicUser.name,
          phone: clinicUser.phone,
          email: clinicUser.email,
          role_id: clinicUser.role_id,
          role_slug: clinicUser.role?.slug,
          database_name: tenantDatabase,
          clinic_id: payload.clinic_id || (clinicId ? +clinicId : undefined),
        };
      }

      // Not a clinic user: try main user (e.g. patient logged in with main app)
      const mainUser = await this.usersService.findOne(payload.sub);
      if (mainUser) {
        return {
          userId: mainUser.id,
          name: mainUser.name,
          phone: mainUser.phone,
          email: mainUser.email,
          role_id: mainUser.role_id,
          role_slug: mainUser.role?.slug,
          isMainUser: true,
        };
      }

      throw new UnauthorizedException('User not found');
    }

    // For non-clinic routes, validate user from main database
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      userId: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role_id: user.role_id,
      database_name: user.database_name,
      role_slug: user.role?.slug,
    };
  }
}
