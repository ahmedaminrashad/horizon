import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../../users/users.service';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { User as ClinicUser } from '../permissions/entities/user.entity';
import { ClinicLoginDto } from './dto/clinic-login.dto';

@Injectable()
export class ClinicAuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private tenantRepositoryService: TenantRepositoryService,
  ) {}

  async login(clinicId: number, clinicLoginDto: ClinicLoginDto) {

    console.log('clinicId : ', clinicId);
    console.log('clinicLoginDto : ', clinicLoginDto);
    // Get clinic user from main database to find database_name
    // Note: Tenant context is automatically set by ClinicTenantInterceptor
    const clinicUser = await this.usersService.findOne(clinicId);

    if (!clinicUser || !clinicUser.database_name) {
      throw new NotFoundException('Clinic not found');
    }

    // Get user repository from clinic database
    const userRepository =
      await this.tenantRepositoryService.getRepository<ClinicUser>(ClinicUser);

    // Find user in clinic database by phone
    const clinicDbUser = await userRepository.findOne({
      where: { phone: clinicLoginDto.phone },
      relations: ['role', 'role.permissions'],
    });

    if (!clinicDbUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(
      clinicLoginDto.password,
      clinicDbUser.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Remove password from response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _password, ...result } = clinicDbUser;

    // Generate token with clinic context
    const payload = {
      sub: clinicDbUser.id,
      role_id: clinicDbUser.role_id,
      database_name: clinicUser.database_name,
      clinic_id: clinicId,
      role_slug: clinicDbUser.role?.slug,
    };

    return {
      ...result,
      access_token: this.jwtService.sign(payload),
    };
  }
}
