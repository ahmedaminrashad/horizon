import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor to add 'name' field to branch responses based on language
 * Returns name_ar if language is 'ar', name_en if language is 'en'
 */
@Injectable()
export class BranchNameInterceptor implements NestInterceptor {
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

        // Helper function to add name field to city objects
        const addNameToCity = (city: any) => {
          if (!city || typeof city !== 'object') return city;
          if (!city.name_ar && !city.name_en) return city;
          const name = lang === 'en' ? (city.name_en || city.name_ar) : city.name_ar;
          return { ...city, name };
        };

        // Helper function to add name field to a branch object
        const addNameToBranch = (branch: any) => {
          if (!branch || typeof branch !== 'object') return branch;
          if (!branch.name_ar && !branch.name_en) return branch;

          const name = lang === 'en' 
            ? (branch.name_en || branch.name_ar) 
            : branch.name_ar;

          const result: any = {
            ...branch,
            name,
          };

          // Add name to nested country relation
          if (branch.country) {
            result.country = addNameToCountry(branch.country);
          }

          // Add name to nested city relation
          if (branch.city) {
            result.city = addNameToCity(branch.city);
          }

          return result;
        };

        // Handle different response structures
        // Case 1: Single branch object
        if (data.name_ar !== undefined || data.name_en !== undefined) {
          return addNameToBranch(data);
        }

        // Case 2: Paginated response with data array
        if (data.data && Array.isArray(data.data)) {
          return {
            ...data,
            data: data.data.map(addNameToBranch),
          };
        }

        // Case 3: Array of branches
        if (Array.isArray(data)) {
          return data.map(addNameToBranch);
        }

        return data;
      }),
    );
  }
}
