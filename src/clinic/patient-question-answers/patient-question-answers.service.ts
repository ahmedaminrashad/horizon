import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository, ObjectLiteral } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TenantRepositoryService } from '../../database/tenant-repository.service';
import { UsersService } from '../../users/users.service';
import { ClinicsService } from '../../clinics/clinics.service';
import { PatientQuestionAnswer } from './entities/patient-question-answer.entity';
import { User } from '../permissions/entities/user.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Question } from '../questions/entities/question.entity';
import { Reservation } from '../reservations/entities/reservation.entity';
import { CreatePatientQuestionAnswerDto } from './dto/create-patient-question-answer.dto';
import { UpdatePatientQuestionAnswerDto } from './dto/update-patient-question-answer.dto';

@Injectable()
export class PatientQuestionAnswersService {
  constructor(
    private tenantRepositoryService: TenantRepositoryService,
    private usersService: UsersService,
    private clinicsService: ClinicsService,
  ) {}

  private async getAnswerRepository(): Promise<
    Repository<PatientQuestionAnswer>
  > {
    const repository =
      await this.tenantRepositoryService.getRepository<PatientQuestionAnswer>(
        PatientQuestionAnswer,
      );
    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repository;
  }

  private async getRepository<T extends ObjectLiteral>(
    entity: new () => T,
  ): Promise<Repository<T>> {
    const repository =
      await this.tenantRepositoryService.getRepository<T>(entity);
    if (!repository) {
      throw new BadRequestException(
        'Clinic context not found. Please ensure you are accessing this endpoint as a clinic user.',
      );
    }
    return repository;
  }

  private async ensurePatientExists(patientId: number): Promise<void> {
    const repo = await this.getRepository(User);
    const user = await repo.findOne({ where: { id: patientId } });
    if (!user) {
      throw new BadRequestException(`Patient with id ${patientId} not found.`);
    }
  }

  private async ensureDoctorExistsAndInClinic(
    doctorId: number,
    clinicId: number,
  ): Promise<void> {
    const repo = await this.getRepository(Doctor);
    const doctor = await repo.findOne({
      where: { id: doctorId, clinic_id: clinicId },
    });
    if (!doctor) {
      throw new BadRequestException(
        `Doctor with id ${doctorId} not found in this clinic.`,
      );
    }
  }

  private async ensureReservationExistsAndInClinic(
    reservationId: number,
    clinicId: number,
  ): Promise<void> {
    const repo = await this.getRepository(Reservation);
    const reservation = await repo.findOne({
      where: { id: reservationId },
      relations: ['doctor'],
    });
    if (!reservation) {
      throw new BadRequestException(
        `Reservation with id ${reservationId} not found.`,
      );
    }
    if (reservation.doctor.clinic_id !== clinicId) {
      throw new BadRequestException(
        `Reservation with id ${reservationId} does not belong to this clinic.`,
      );
    }
  }

  /**
   * Resolve main user id to clinic user id using main DB clinic_user link (user_id, clinic_id, clinic_user_id).
   * If link exists with clinic_user_id, return it. Else find/create clinic user by phone and save link.
   */
  async getOrCreateClinicUserIdFromMainUser(
    mainUserId: number,
    clinicId: number,
  ): Promise<number> {
    const existing = await this.clinicsService.getClinicUserIdForMainUser(
      mainUserId,
      clinicId,
    );
    if (existing != null) {
      return existing;
    }
    const mainUser = await this.usersService.findOne(mainUserId);
    if (!mainUser) {
      throw new BadRequestException(`Main user with id ${mainUserId} not found.`);
    }
    const clinicUserRepo = await this.getRepository(User);
    let clinicUser = await clinicUserRepo.findOne({
      where: { phone: mainUser.phone },
    });
    if (!clinicUser) {
      if (mainUser.email) {
        const existingByEmail = await clinicUserRepo.findOne({
          where: { email: mainUser.email },
        });
        if (existingByEmail) {
          throw new BadRequestException(
            'User with this email already exists in clinic.',
          );
        }
      }
      const randomPassword = await bcrypt.hash(
        Math.random().toString(36).slice(-8),
        10,
      );
      clinicUser = clinicUserRepo.create({
        name: mainUser.name ?? null,
        phone: mainUser.phone,
        email: mainUser.email ?? undefined,
        password: randomPassword,
        package_id: 0,
      });
      clinicUser = await clinicUserRepo.save(clinicUser);
    }
    await this.clinicsService.setClinicUserIdForMainUser(
      mainUserId,
      clinicId,
      clinicUser.id,
    );
    return clinicUser.id;
  }

  private async getQuestionInClinic(
    questionId: number,
    clinicId: number,
  ): Promise<Question> {
    const repo = await this.getRepository(Question);
    const question = await repo.findOne({
      where: { id: questionId, clinic_id: clinicId },
    });
    if (!question) {
      throw new BadRequestException(
        `Question with id ${questionId} not found in this clinic.`,
      );
    }
    return question;
  }

  async create(
    clinicId: number,
    createDto: CreatePatientQuestionAnswerDto,
    patientIdFromToken: number,
  ): Promise<PatientQuestionAnswer> {
    await this.ensurePatientExists(patientIdFromToken);
    const question = await this.getQuestionInClinic(
      createDto.question_id,
      clinicId,
    );
    if (createDto.reservation_id != null) {
      await this.ensureReservationExistsAndInClinic(
        createDto.reservation_id,
        clinicId,
      );
    }
    const repository = await this.getAnswerRepository();
    const answer = repository.create({
      ...createDto,
      patient_id: patientIdFromToken,
      doctor_id: question.doctor_id,
      clinic_id: clinicId,
    });
    return repository.save(answer);
  }

  async findAll(
    clinicId: number,
    page: number = 1,
    limit: number = 10,
    filters?: {
      patient_id?: number;
      doctor_id?: number;
      question_id?: number;
      reservation_id?: number;
      clinic_id?: number;
    },
  ): Promise<{
    data: PatientQuestionAnswer[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const repository = await this.getAnswerRepository();
    const skip = (page - 1) * limit;
    const effectiveClinicId = filters?.clinic_id ?? clinicId;

    const qb = repository
      .createQueryBuilder('answer')
      .leftJoinAndSelect('answer.patient', 'patient')
      .leftJoinAndSelect('answer.doctor', 'doctor')
      .leftJoinAndSelect('answer.question', 'question')
      .leftJoinAndSelect('answer.reservation', 'reservation')
      .where('answer.clinic_id = :clinicId', { clinicId: effectiveClinicId })
      .orderBy('answer.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters?.patient_id != null) {
      qb.andWhere('answer.patient_id = :patientId', {
        patientId: filters.patient_id,
      });
    }
    if (filters?.doctor_id != null) {
      qb.andWhere('answer.doctor_id = :doctorId', {
        doctorId: filters.doctor_id,
      });
    }
    if (filters?.question_id != null) {
      qb.andWhere('answer.question_id = :questionId', {
        questionId: filters.question_id,
      });
    }
    if (filters?.reservation_id != null) {
      qb.andWhere('answer.reservation_id = :reservationId', {
        reservationId: filters.reservation_id,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, totalPages };
  }

  async findOne(
    clinicId: number,
    id: number,
  ): Promise<PatientQuestionAnswer> {
    const repository = await this.getAnswerRepository();
    const answer = await repository.findOne({
      where: { id, clinic_id: clinicId },
      relations: ['patient', 'doctor', 'question', 'reservation'],
    });
    if (!answer) {
      throw new NotFoundException(
        `Patient question answer with id ${id} not found.`,
      );
    }
    return answer;
  }

  async update(
    clinicId: number,
    id: number,
    updateDto: UpdatePatientQuestionAnswerDto,
  ): Promise<PatientQuestionAnswer> {
    const answer = await this.findOne(clinicId, id);
    if (updateDto.question_id != null) {
      const question = await this.getQuestionInClinic(
        updateDto.question_id,
        clinicId,
      );
      answer.doctor_id = question.doctor_id;
    }
    // patient_id and doctor_id are not updatable from body (doctor_id comes from question)
    if (updateDto.reservation_id != null) {
      await this.ensureReservationExistsAndInClinic(
        updateDto.reservation_id,
        clinicId,
      );
    }
    const repository = await this.getAnswerRepository();
    Object.assign(answer, updateDto);
    return repository.save(answer);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const answer = await this.findOne(clinicId, id);
    const repository = await this.getAnswerRepository();
    await repository.remove(answer);
  }
}
