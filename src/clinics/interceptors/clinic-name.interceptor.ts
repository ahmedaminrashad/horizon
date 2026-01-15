import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Interceptor to add 'name' field to clinic responses based on language
 * Returns name_ar if language is 'ar', name_en if language is 'en'
 */
@Injectable()
export class ClinicNameInterceptor implements NestInterceptor {
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

        // Helper function to add name field to a clinic object
        const addNameToClinic = (clinic: any) => {
          if (!clinic || typeof clinic !== 'object') return clinic;
          if (!clinic.name_ar && !clinic.name_en) return clinic;

          const name = lang === 'en' 
            ? (clinic.name_en || clinic.name_ar) 
            : clinic.name_ar;

          const result: any = {
            ...clinic,
            name,
          };

          // Add name to nested country relation
          if (clinic.country) {
            result.country = addNameToCountry(clinic.country);
          }

          // Add name to nested city relation
          if (clinic.city) {
            result.city = addNameToCity(clinic.city);
          }

          return result;
        };

        // Handle different response structures
        // Case 1: Single clinic object
        if (data.name_ar !== undefined || data.name_en !== undefined) {
          return addNameToClinic(data);
        }

        // Case 2: Paginated response with data array
        if (data.data && Array.isArray(data.data)) {
          return {
            ...data,
            data: data.data.map(addNameToClinic),
          };
        }

        // Case 3: Object with clinic property (e.g., { clinic: {...} })
        if (data.clinic && (data.clinic.name_ar !== undefined || data.clinic.name_en !== undefined)) {
          return {
            ...data,
            clinic: addNameToClinic(data.clinic),
          };
        }

        // Case 4: Array of clinics
        if (Array.isArray(data)) {
          return data.map(addNameToClinic);
        }

        // Case 5: Search response structure with doctors and clinics
        if (data.doctors && data.clinics) {
          return {
            ...data,
            doctors: {
              ...data.doctors,
              data: Array.isArray(data.doctors.data)
                ? data.doctors.data.map((doctor: any) => {
                    // Add name to clinic in doctor.clinic if it exists
                    if (doctor.clinic) {
                      return {
                        ...doctor,
                        clinic: addNameToClinic(doctor.clinic),
                      };
                    }
                    return doctor;
                  })
                : data.doctors.data,
            },
            clinics: {
              ...data.clinics,
              data: Array.isArray(data.clinics.data)
                ? data.clinics.data.map(addNameToClinic)
                : data.clinics.data,
            },
          };
        }

        return data;
      }),
    );
  }
}
