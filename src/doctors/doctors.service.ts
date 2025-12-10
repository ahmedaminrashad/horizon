import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
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
      });
      return this.doctorsRepository.save(doctor);
    }
  }
}
