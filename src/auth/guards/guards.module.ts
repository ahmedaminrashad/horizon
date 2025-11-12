import { Module, forwardRef } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { PermissionsGuard } from './permissions.guard';
import { UsersModule } from '../../users/users.module';

@Module({
  imports: [forwardRef(() => UsersModule)],
  providers: [RolesGuard, PermissionsGuard],
  exports: [RolesGuard, PermissionsGuard],
})
export class GuardsModule {}
