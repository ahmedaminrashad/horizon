import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * Global interceptor to extract language from request headers
 * Stores the language in request.lang for access throughout the application
 */
@Injectable()
export class LangInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Extract language from headers (check both 'lang' and 'x-lang')
    const lang = request.headers['lang'] || request.headers['x-lang'];
    
    // Store language in request object (lowercase for consistency)
    if (lang) {
      request.lang = String(lang).toLowerCase();
    } else {
      request.lang = undefined;
    }
    
    return next.handle();
  }
}
