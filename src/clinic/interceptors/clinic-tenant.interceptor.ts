import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TenantContextService } from '../../database/tenant-context.service';

/**
 * Interceptor for cleanup after request completes
 * Note: ClinicTenantGuard handles DataSource initialization before JWT auth
 */
@Injectable()
export class ClinicTenantInterceptor implements NestInterceptor {
  constructor(private tenantContextService: TenantContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Note: ClinicTenantGuard handles DataSource initialization before this interceptor runs
    // This interceptor only handles cleanup after the request completes
    return next.handle().pipe(
      tap({
        next: () => {
          // Clear tenant context after request completes successfully
          this.tenantContextService.clear();
        },
        error: () => {
          // Clear tenant context on error as well
          this.tenantContextService.clear();
        },
      }),
    );
  }
}
