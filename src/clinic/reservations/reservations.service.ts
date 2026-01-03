import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { Reservation, ReservationStatus } from './entities/reservation.entity';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { Doctor } from '../doctors/entities/doctor.entity';
import { DoctorsService as MainDoctorsService } from '../../doctors/doctors.service';

@Injectable()
export class ReservationsService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private mainDoctorsService: MainDoctorsService,
  ) {}

  /**
   * Get repository for the current tenant context
   */
  private async getRepository(): Promise<Repository<Reservation>> {
    const repository = await this.tenantRepositoryService.getRepository<Reservation>(
      Reservation,
    );

    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }

    return repository;
  }

  async create(clinicId: number, createReservationDto: CreateReservationDto): Promise<Reservation> {
    const repository = await this.getRepository();
    
    const reservation = repository.create({
      ...createReservationDto,
      date_time: new Date(createReservationDto.date_time),
      status: createReservationDto.status || ReservationStatus.PENDING,
      paid: createReservationDto.paid || false,
    });

    const savedReservation = await repository.save(reservation);

    // Increment doctor's number_of_patients
    await this.incrementDoctorPatientCount(clinicId, createReservationDto.doctor_id);

    return savedReservation;
  }

  /**
   * Increment doctor's number_of_patients in both clinic and main doctors tables
   */
  private async incrementDoctorPatientCount(clinicId: number, doctorId: number): Promise<void> {
    try {
      // Get clinic doctor repository
      const doctorRepository = await this.tenantRepositoryService.getRepository<Doctor>(Doctor);
      
      if (doctorRepository) {
        // Load doctor with user relation to get name for syncing
        const doctor = await doctorRepository.findOne({ 
          where: { id: doctorId },
          relations: ['user'],
        });
        
        if (doctor) {
          // Increment in clinic doctors table
          doctor.number_of_patients = (doctor.number_of_patients || 0) + 1;
          await doctorRepository.save(doctor);

          // Get doctor name from user relation
          const doctorName = doctor.user?.name || '';
          
          // Sync to main doctors table using clinic doctor id as clinic_doctor_id
          await this.mainDoctorsService.syncDoctor(clinicId, doctorId, {
            name: doctorName,
            age: doctor.age,
            avatar: doctor.avatar,
            email: doctor.user?.email,
            phone: doctor.user?.phone,
            department: doctor.department,
            license_number: doctor.license_number,
            degree: doctor.degree,
            languages: doctor.languages,
            bio: doctor.bio,
            appoint_type: doctor.appoint_type,
            is_active: doctor.is_active,
            branch_id: doctor.branch_id,
            experience_years: doctor.experience_years,
            number_of_patients: doctor.number_of_patients,
          });
        }
      }
    } catch (error) {
      // Log error but don't fail the reservation creation
      console.error(`Failed to increment doctor patient count for doctor ${doctorId}:`, error);
    }
  }

  async findAll(clinicId: number, page: number = 1, limit: number = 10) {
    const repository = await this.getRepository();
    const skip = (page - 1) * limit;

    const [data, total] = await repository.findAndCount({
      relations: ['doctor', 'doctor.user', 'patient'],
      skip,
      take: limit,
      order: {
        date_time: 'DESC',
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

  async findOne(clinicId: number, id: number): Promise<Reservation> {
    const repository = await this.getRepository();
    const reservation = await repository.findOne({
      where: { id },
      relations: ['doctor', 'doctor.user', 'patient'],
    });

    if (!reservation) {
      throw new NotFoundException(`Reservation with ID ${id} not found`);
    }

    return reservation;
  }

  async update(clinicId: number, id: number, updateReservationDto: UpdateReservationDto): Promise<Reservation> {
    const repository = await this.getRepository();
    const reservation = await this.findOne(clinicId, id);

    const updateData: any = { ...updateReservationDto };
    if (updateReservationDto.date_time) {
      updateData.date_time = new Date(updateReservationDto.date_time);
    }

    Object.assign(reservation, updateData);
    return repository.save(reservation);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const repository = await this.getRepository();
    const reservation = await this.findOne(clinicId, id);
    await repository.remove(reservation);
  }
}
