import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor to add 'name' field to country responses based on language
 * Returns name_ar if language is 'ar', name_en if language is 'en'
 */
@Injectable()
export class CountryNameInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const lang = request.lang || 'ar';

    return next.handle().pipe(
      map((data) => {
        if (!data) return data;

        // Helper function to add name field to a country object
        const addNameToCountry = (country: any) => {
          if (!country || typeof country !== 'object') return country;
          if (!country.name_ar && !country.name_en) return country;

          const name = lang === 'en' 
            ? (country.name_en || country.name_ar) 
            : country.name_ar;

          return {
            ...country,
            name,
          };
        };

        // Handle different response structures
        // Case 1: Single country object
        if (data.name_ar !== undefined || data.name_en !== undefined) {
          return addNameToCountry(data);
        }

        // Case 2: Paginated response with data array
        if (data.data && Array.isArray(data.data)) {
          return {
            ...data,
            data: data.data.map(addNameToCountry),
          };
        }

        // Case 3: Array of countries
        if (Array.isArray(data)) {
          return data.map(addNameToCountry);
        }

        return data;
      }),
    );
  }
}
