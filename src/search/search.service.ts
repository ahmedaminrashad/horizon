import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Service } from '../services/entities/service.entity';
import { SearchQueryDto } from './dto/search-query.dto';
import { LangContextService } from '../common/services/lang-context.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    @InjectRepository(Clinic)
    private clinicsRepository: Repository<Clinic>,
    @InjectRepository(Branch)
    private branchesRepository: Repository<Branch>,
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
    private langContextService: LangContextService,
  ) {}

  async search(searchQuery: SearchQueryDto) {
    const page = searchQuery.page || 1;
    const limit = searchQuery.limit || 10;
    const skip = (page - 1) * limit;

    // Build doctor query
    const doctorQuery = this.doctorsRepository
      .createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.branch', 'branch')
      .leftJoin(Clinic, 'clinic', 'clinic.id = doctor.clinic_id')
      .addSelect(['clinic.id', 'clinic.name_ar', 'clinic.name_en', 'clinic.image'])
      .where('doctor.is_active = :isActive', { isActive: true });

    // Build clinic query
    const clinicQuery = this.clinicsRepository
      .createQueryBuilder('clinic')
      .leftJoinAndSelect('clinic.country', 'country')
      .leftJoinAndSelect('clinic.city', 'city')
      .leftJoinAndSelect('clinic.branches', 'branches')
      .where('clinic.is_active = :isActive', { isActive: true });

    // Apply search term
    if (searchQuery.search) {
      const searchTerm = `%${searchQuery.search}%`;
      
      // Find clinic IDs that have matching services
      const matchingServices = await this.servicesRepository
        .createQueryBuilder('service')
        .select('DISTINCT service.clinic_id', 'clinic_id')
        .where('service.name LIKE :search', { search: searchTerm })
        .andWhere('service.is_active = :isActive', { isActive: true })
        .getRawMany();
      
      const clinicIdsWithMatchingServices = matchingServices.map(
        (s) => s.clinic_id,
      );
      
      // For doctors: search in name, specialty, clinic name (both ar and en), or if clinic has matching service
      const doctorSearchConditions = [
        'doctor.name LIKE :search',
        'doctor.specialty LIKE :search',
        'clinic.name_ar LIKE :search',
        'clinic.name_en LIKE :search',
      ];
      
      if (clinicIdsWithMatchingServices.length > 0) {
        doctorQuery.andWhere(
          `(${doctorSearchConditions.join(' OR ')} OR doctor.clinic_id IN (:...clinicIds))`,
          { search: searchTerm, clinicIds: clinicIdsWithMatchingServices },
        );
      } else {
        doctorQuery.andWhere(
          `(${doctorSearchConditions.join(' OR ')})`,
          { search: searchTerm },
        );
      }

      // For clinics: search in name (both ar and en) or if clinic has matching services
      if (clinicIdsWithMatchingServices.length > 0) {
        clinicQuery.andWhere(
          '((clinic.name_ar LIKE :search OR clinic.name_en LIKE :search) OR clinic.id IN (:...clinicIds))',
          { search: searchTerm, clinicIds: clinicIdsWithMatchingServices },
        );
      } else {
        clinicQuery.andWhere('(clinic.name_ar LIKE :search OR clinic.name_en LIKE :search)', {
          search: searchTerm,
        });
      }
    }

    // Apply city filter
    if (searchQuery.city_id) {
      // For doctors: filter by branch city or clinic city
      doctorQuery.andWhere(
        '(branch.city_id = :cityId OR doctor.clinic_id IN (SELECT id FROM clinics WHERE city_id = :cityId))',
        { cityId: searchQuery.city_id },
      );

      // For clinics: filter by city
      clinicQuery.andWhere('clinic.city_id = :cityId', {
        cityId: searchQuery.city_id,
      });
    }

    // Apply area/branch filter
    if (searchQuery.area_id) {
      // For doctors: filter by branch
      doctorQuery.andWhere('doctor.branch_id = :areaId', {
        areaId: searchQuery.area_id,
      });

      // For clinics: filter by branches in that area - use subquery
      clinicQuery.andWhere(
        'clinic.id IN (SELECT clinic_id FROM branches WHERE id = :areaId)',
        {
          areaId: searchQuery.area_id,
        },
      );
    }

    // Apply appointment type filter (only for doctors)
    if (searchQuery.appoint_type) {
      doctorQuery.andWhere('doctor.appoint_type = :appointType', {
        appointType: searchQuery.appoint_type,
      });
    }

    // Apply language filter (only for doctors)
    if (searchQuery.language) {
      doctorQuery.andWhere('doctor.languages LIKE :language', {
        language: `%${searchQuery.language}%`,
      });
    }

    // Apply gender filter (only for doctors)
    // Note: Gender field doesn't exist in current schema, but we'll add the filter for future use
    if (searchQuery.gender) {
      // This will be implemented when gender field is added to doctor entity
      // doctorQuery.andWhere('doctor.gender = :gender', { gender: searchQuery.gender });
    }

    // Get doctors with pagination
    const [doctors, doctorsTotal] = await doctorQuery
      .skip(skip)
      .take(limit)
      .orderBy('doctor.createdAt', 'DESC')
      .getManyAndCount();

    // Get clinics with pagination
    const [clinics, clinicsTotal] = await clinicQuery
      .skip(skip)
      .take(limit)
      .orderBy('clinic.createdAt', 'DESC')
      .getManyAndCount();

    // Calculate pagination metadata
    const doctorsTotalPages = Math.ceil(doctorsTotal / limit);
    const clinicsTotalPages = Math.ceil(clinicsTotal / limit);

    return {
      doctors: {
        data: doctors,
        meta: {
          total: doctorsTotal,
          page,
          limit,
          totalPages: doctorsTotalPages,
          hasNextPage: page < doctorsTotalPages,
          hasPreviousPage: page > 1,
        },
      },
      clinics: {
        data: clinics,
        meta: {
          total: clinicsTotal,
          page,
          limit,
          totalPages: clinicsTotalPages,
          hasNextPage: page < clinicsTotalPages,
          hasPreviousPage: page > 1,
        },
      },
      meta: {
        total: doctorsTotal + clinicsTotal,
        page,
        limit,
      },
    };
  }
}

