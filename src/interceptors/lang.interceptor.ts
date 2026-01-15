import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { LangContextService } from '../common/services/lang-context.service';

/**
 * Global interceptor to extract language from request headers
 * Stores the language in request.lang and LangContextService for access throughout the application
 * Defaults to 'ar' (Arabic) if no language header is provided
 */
@Injectable()
export class LangInterceptor implements NestInterceptor {
  constructor(private langContextService: LangContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // Extract language from headers (check both 'lang' and 'x-lang')
    const lang = request.headers['lang'] || request.headers['x-lang'];
    
    // Store language in request object (lowercase for consistency)
    // Default to 'ar' (Arabic) if no language header is provided
    const language = lang ? String(lang).toLowerCase() : 'ar';
    request.lang = language;
    
    // Store language in LangContextService for use in services
    this.langContextService.setLang(language);
    
    return next.handle();
  }
}
