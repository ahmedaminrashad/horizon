import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor to add 'name', 'content', and 'features' fields to package responses based on language
 * Returns name_ar/content_ar/features_ar if language is 'ar', name_en/content_en/features_en if language is 'en'
 */
@Injectable()
export class PackageNameInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const lang = request.lang || 'ar';

    return next.handle().pipe(
      map((data) => {
        if (!data) return data;

        // Helper function to add name, content, and features fields to a package object
        const addTranslationToPackage = (pkg: any) => {
          if (!pkg || typeof pkg !== 'object') return pkg;

          const result: any = { ...pkg };

          // Add name field
          if (pkg.name_ar !== undefined || pkg.name_en !== undefined) {
            result.name = lang === 'en'
              ? (pkg.name_en || pkg.name_ar)
              : (pkg.name_ar || pkg.name_en);
          }

          // Add content field
          if (pkg.content_ar !== undefined || pkg.content_en !== undefined) {
            result.content = lang === 'en'
              ? (pkg.content_en || pkg.content_ar)
              : (pkg.content_ar || pkg.content_en);
          }

          // Add features field
          if (pkg.features_ar !== undefined || pkg.features_en !== undefined) {
            result.features = lang === 'en'
              ? (pkg.features_en || pkg.features_ar)
              : (pkg.features_ar || pkg.features_en);
          }

          return result;
        };

        // Handle different response structures
        // Case 1: Single package object
        if (data.id !== undefined && (data.name_ar !== undefined || data.name_en !== undefined)) {
          return addTranslationToPackage(data);
        }

        // Case 2: Paginated response with data array
        if (data.data && Array.isArray(data.data)) {
          return {
            ...data,
            data: data.data.map(addTranslationToPackage),
          };
        }

        // Case 3: Object with package property (e.g., { package: {...} })
        if (data.package && (data.package.name_ar !== undefined || data.package.name_en !== undefined)) {
          return {
            ...data,
            package: addTranslationToPackage(data.package),
          };
        }

        // Case 4: Array of packages
        if (Array.isArray(data)) {
          return data.map(addTranslationToPackage);
        }

        return data;
      }),
    );
  }
}
