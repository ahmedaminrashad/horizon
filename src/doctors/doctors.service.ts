import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { ServicesService } from '../services/services.service';
import { Service } from '../services/entities/service.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    private servicesService: ServicesService,
  ) {}

  async findAll(page: number = 1, limit: number = 10, clinicId?: number) {
    const skip = (page - 1) * limit;

    const where = clinicId ? { clinic_id: clinicId } : {};

    const [data, total] = await this.doctorsRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: number): Promise<Doctor> {
    const doctor = await this.doctorsRepository.findOne({
      where: { id },
    });

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return doctor;
  }

  async findByClinicDoctorId(
    clinicId: number,
    clinicDoctorId: number,
  ): Promise<Doctor | null> {
    return this.doctorsRepository.findOne({
      where: {
        clinic_id: clinicId,
        clinic_doctor_id: clinicDoctorId,
      },
    });
  }

  async syncDoctor(
    clinicId: number,
    clinicDoctorId: number,
    doctorData: {
      name: string;
      age?: number;
      avatar?: string;
      email?: string;
      phone?: string;
      department?: string;
      license_number?: string;
      degree?: string;
      languages?: string;
      bio?: string;
      appoint_type?: string;
      is_active?: boolean;
      branch_id?: number;
      experience_years?: number;
      number_of_patients?: number;
    },
  ): Promise<Doctor> {
    const existingDoctor = await this.findByClinicDoctorId(
      clinicId,
      clinicDoctorId,
    );

    if (existingDoctor) {
      // Update existing doctor
      Object.assign(existingDoctor, {
        name: doctorData.name,
        age: doctorData.age,
        avatar: doctorData.avatar,
        email: doctorData.email,
        phone: doctorData.phone,
        department: doctorData.department as any,
        license_number: doctorData.license_number,
        degree: doctorData.degree,
        languages: doctorData.languages,
        bio: doctorData.bio,
        appoint_type: doctorData.appoint_type as any,
        is_active: doctorData.is_active,
        branch_id: doctorData.branch_id,
        experience_years: doctorData.experience_years,
        number_of_patients: doctorData.number_of_patients,
      });
      return this.doctorsRepository.save(existingDoctor);
    } else {
      // Create new doctor
      const doctor = this.doctorsRepository.create({
        name: doctorData.name,
        age: doctorData.age,
        clinic_id: clinicId,
        clinic_doctor_id: clinicDoctorId,
        avatar: doctorData.avatar,
        email: doctorData.email,
        phone: doctorData.phone,
        department: doctorData.department as any,
        license_number: doctorData.license_number,
        degree: doctorData.degree,
        languages: doctorData.languages,
        bio: doctorData.bio,
        appoint_type: doctorData.appoint_type as any,
        is_active:
          doctorData.is_active !== undefined ? doctorData.is_active : true,
        branch_id: doctorData.branch_id,
        experience_years: doctorData.experience_years,
        number_of_patients: doctorData.number_of_patients,
      });
      return this.doctorsRepository.save(doctor);
    }
  }

  async suggestServices(doctorId: number): Promise<Service[]> {
    const doctor = await this.findOne(doctorId);

    // Find services matching doctor's specialty and degree
    const services = await this.servicesService.findMatchingServices(
      doctor.specialty || undefined,
      doctor.degree || undefined,
      doctor.clinic_id,
    );

    return services;
  }
}
