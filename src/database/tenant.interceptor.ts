import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TenantContextService } from './tenant-context.service';

@Injectable()
export class TenantInterceptor implements NestInterceptor {
  constructor(private tenantContextService: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If user is authenticated and has clinic role, set tenant database
    if (user && user.role_slug === 'clinic' && user.database_name) {
      this.tenantContextService.setTenantDatabase(user.database_name);
    }
    // If not a clinic user, don't modify the context (let ClinicTenantInterceptor handle it)

    return next.handle().pipe(
      tap(() => {
        // Clear tenant context after request
        this.tenantContextService.clear();
      }),
    );
  }
}
