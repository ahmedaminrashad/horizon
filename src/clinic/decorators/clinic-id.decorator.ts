import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to get clinicId from JWT token (request.user.clinic_id) or route params
 * Usage: @ClinicId() clinicId: number
 */
export const ClinicId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): number | undefined => {
    const request = ctx.switchToHttp().getRequest();
    
    // First try to get from request.user (set by JWT strategy)
    if (request.user?.clinic_id) {
      return request.user.clinic_id;
    }
    
    // Then try from request.clinicId (set by ClinicTenantGuard)
    if (request.clinicId) {
      return request.clinicId;
    }
    
    // Finally fallback to route params
    if (request.params?.clinicId) {
      return +request.params.clinicId;
    }
    
    return undefined;
  },
);
