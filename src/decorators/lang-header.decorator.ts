import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Custom decorator to extract the language from the request
 * The language is set by LangInterceptor from request headers and stored in request.lang
 * Usage: @LangHeader() lang?: string
 */
export const LangHeader = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    
    // Language is already set by LangInterceptor in request.lang
    return request.lang;
  },
);
