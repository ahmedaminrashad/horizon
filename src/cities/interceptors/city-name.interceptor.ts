import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor to add 'name' field to city responses based on language
 * Returns name_ar if language is 'ar', name_en if language is 'en'
 */
@Injectable()
export class CityNameInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const lang = request.lang || 'ar';

    return next.handle().pipe(
      map((data) => {
        if (!data) return data;

        // Helper function to add name field to country objects
        const addNameToCountry = (country: any) => {
          if (!country || typeof country !== 'object') return country;
          if (!country.name_ar && !country.name_en) return country;
          const name = lang === 'en' ? (country.name_en || country.name_ar) : country.name_ar;
          return { ...country, name };
        };

        // Helper function to add name field to a city object
        const addNameToCity = (city: any) => {
          if (!city || typeof city !== 'object') return city;
          if (!city.name_ar && !city.name_en) return city;

          const name = lang === 'en' 
            ? (city.name_en || city.name_ar) 
            : city.name_ar;

          const result: any = {
            ...city,
            name,
          };

          // Add name to nested country relation
          if (city.country) {
            result.country = addNameToCountry(city.country);
          }

          return result;
        };

        // Handle different response structures
        // Case 1: Single city object
        if (data.name_ar !== undefined || data.name_en !== undefined) {
          return addNameToCity(data);
        }

        // Case 2: Paginated response with data array
        if (data.data && Array.isArray(data.data)) {
          return {
            ...data,
            data: data.data.map(addNameToCity),
          };
        }

        // Case 3: Array of cities
        if (Array.isArray(data)) {
          return data.map(addNameToCity);
        }

        return data;
      }),
    );
  }
}
