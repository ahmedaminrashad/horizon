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
    
    // Then route params
    if (request.params?.clinicId) {
      return +request.params.clinicId;
    }

    // Query string (e.g. clinic_id=1)
    if (request.query?.clinic_id) {
      return +request.query.clinic_id;
    }

    // Body (e.g. POST with clinic_id in body)
    if (request.body?.clinic_id != null) {
      return +request.body.clinic_id;
    }
    
    return undefined;
  },
);
