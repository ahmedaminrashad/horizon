import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { QuestionSet } from './entities/question-set.entity';
import { Question } from './entities/question.entity';
import { QuestionSetAssignment } from './entities/question-set-assignment.entity';
import { CreateQuestionSetDto } from './dto/create-question-set.dto';
import { UpdateQuestionSetDto } from './dto/update-question-set.dto';
import { CreateQuestionSetAssignmentDto } from './dto/create-question-set-assignment.dto';
import { UpdateQuestionSetAssignmentDto } from './dto/update-question-set-assignment.dto';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Service } from '../services/entities/service.entity';
import { Branch } from '../branches/entities/branch.entity';
import { AppointType } from '../doctors/entities/doctor.entity';

@Injectable()
export class QuestionSetsService {
  constructor(
    @InjectRepository(QuestionSet)
    private questionSetsRepository: Repository<QuestionSet>,
    @InjectRepository(Question)
    private questionsRepository: Repository<Question>,
    @InjectRepository(QuestionSetAssignment)
    private assignmentsRepository: Repository<QuestionSetAssignment>,
    @InjectRepository(Doctor)
    private doctorsRepository: Repository<Doctor>,
    @InjectRepository(Service)
    private servicesRepository: Repository<Service>,
    @InjectRepository(Branch)
    private branchesRepository: Repository<Branch>,
  ) {}

  async create(
    clinicId: number,
    createQuestionSetDto: CreateQuestionSetDto,
  ): Promise<QuestionSet> {
    const questionSet = this.questionSetsRepository.create({
      ...createQuestionSetDto,
      clinic_id: clinicId,
    });

    const savedQuestionSet = await this.questionSetsRepository.save(questionSet);

    // Create questions if provided
    if (createQuestionSetDto.questions && createQuestionSetDto.questions.length > 0) {
      const questions = createQuestionSetDto.questions.map((q) =>
        this.questionsRepository.create({
          ...q,
          question_set_id: savedQuestionSet.id,
        }),
      );
      await this.questionsRepository.save(questions);
    }

    return this.findOne(clinicId, savedQuestionSet.id);
  }

  async findAll(
    clinicId: number,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: QuestionSet[];
    meta: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.questionSetsRepository.findAndCount({
      where: { clinic_id: clinicId },
      relations: ['questions', 'assignments'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
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

  async findOne(clinicId: number, id: number): Promise<QuestionSet> {
    const questionSet = await this.questionSetsRepository.findOne({
      where: { id, clinic_id: clinicId },
      relations: ['questions', 'assignments'],
      order: { questions: { order: 'ASC' } },
    });

    if (!questionSet) {
      throw new NotFoundException(`Question set with ID ${id} not found`);
    }

    return questionSet;
  }

  async update(
    clinicId: number,
    id: number,
    updateQuestionSetDto: UpdateQuestionSetDto,
  ): Promise<QuestionSet> {
    const questionSet = await this.findOne(clinicId, id);

    Object.assign(questionSet, updateQuestionSetDto);
    return this.questionSetsRepository.save(questionSet);
  }

  async remove(clinicId: number, id: number): Promise<void> {
    const questionSet = await this.findOne(clinicId, id);
    await this.questionSetsRepository.remove(questionSet);
  }

  async createAssignment(
    clinicId: number,
    createAssignmentDto: CreateQuestionSetAssignmentDto,
  ): Promise<QuestionSetAssignment> {
    // Verify question set belongs to clinic
    const questionSet = await this.questionSetsRepository.findOne({
      where: {
        id: createAssignmentDto.question_set_id,
        clinic_id: clinicId,
      },
    });

    if (!questionSet) {
      throw new NotFoundException('Question set not found');
    }

    // Validate referenced entities belong to clinic
    if (createAssignmentDto.doctor_id) {
      const doctor = await this.doctorsRepository.findOne({
        where: {
          id: createAssignmentDto.doctor_id,
          clinic_id: clinicId,
        },
      });
      if (!doctor) {
        throw new NotFoundException('Doctor not found');
      }
    }

    if (createAssignmentDto.service_id) {
      const service = await this.servicesRepository.findOne({
        where: { id: createAssignmentDto.service_id },
      });
      if (!service) {
        throw new NotFoundException('Service not found');
      }
    }

    if (createAssignmentDto.branch_id) {
      const branch = await this.branchesRepository.findOne({
        where: {
          id: createAssignmentDto.branch_id,
          clinic_id: clinicId,
        },
      });
      if (!branch) {
        throw new NotFoundException('Branch not found');
      }
    }

    // Calculate priority if not provided
    let priority = createAssignmentDto.priority;
    if (priority === undefined) {
      if (createAssignmentDto.service_id) {
        priority = 5; // Service has highest priority
      } else if (createAssignmentDto.doctor_id) {
        priority = 4; // Doctor-specific
      } else if (createAssignmentDto.specialty) {
        priority = 3; // Specialty-specific
      } else if (createAssignmentDto.appoint_type) {
        priority = 2; // Visit type-specific
      } else if (createAssignmentDto.branch_id) {
        priority = 1; // Branch-specific
      } else {
        priority = 0; // Default
      }
    }

    // Check for duplicate assignment using query builder for proper NULL handling
    const duplicateQuery = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .where('assignment.question_set_id = :questionSetId', {
        questionSetId: createAssignmentDto.question_set_id,
      });

    if (createAssignmentDto.doctor_id !== undefined) {
      duplicateQuery.andWhere(
        'assignment.doctor_id = :doctorId',
        { doctorId: createAssignmentDto.doctor_id || null },
      );
    } else {
      duplicateQuery.andWhere('assignment.doctor_id IS NULL');
    }

    if (createAssignmentDto.service_id !== undefined) {
      duplicateQuery.andWhere(
        'assignment.service_id = :serviceId',
        { serviceId: createAssignmentDto.service_id || null },
      );
    } else {
      duplicateQuery.andWhere('assignment.service_id IS NULL');
    }

    if (createAssignmentDto.specialty !== undefined) {
      duplicateQuery.andWhere(
        'assignment.specialty = :specialty',
        { specialty: createAssignmentDto.specialty || null },
      );
    } else {
      duplicateQuery.andWhere('assignment.specialty IS NULL');
    }

    if (createAssignmentDto.appoint_type !== undefined) {
      duplicateQuery.andWhere(
        'assignment.appoint_type = :appointType',
        { appointType: createAssignmentDto.appoint_type || null },
      );
    } else {
      duplicateQuery.andWhere('assignment.appoint_type IS NULL');
    }

    if (createAssignmentDto.branch_id !== undefined) {
      duplicateQuery.andWhere(
        'assignment.branch_id = :branchId',
        { branchId: createAssignmentDto.branch_id || null },
      );
    } else {
      duplicateQuery.andWhere('assignment.branch_id IS NULL');
    }

    const existing = await duplicateQuery.getOne();

    if (existing) {
      throw new ConflictException('Assignment already exists');
    }

    const assignment = this.assignmentsRepository.create({
      ...createAssignmentDto,
      priority,
    });

    return this.assignmentsRepository.save(assignment);
  }

  async findAllAssignments(
    clinicId: number,
    questionSetId?: number,
  ): Promise<QuestionSetAssignment[]> {
    const queryBuilder = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.questionSet', 'questionSet')
      .leftJoinAndSelect('assignment.doctor', 'doctor')
      .leftJoinAndSelect('assignment.service', 'service')
      .leftJoinAndSelect('assignment.branch', 'branch')
      .where('questionSet.clinic_id = :clinicId', { clinicId });

    if (questionSetId) {
      queryBuilder.andWhere('assignment.question_set_id = :questionSetId', {
        questionSetId,
      });
    }

    return queryBuilder.orderBy('assignment.priority', 'DESC').getMany();
  }

  async updateAssignment(
    clinicId: number,
    id: number,
    updateAssignmentDto: UpdateQuestionSetAssignmentDto,
  ): Promise<QuestionSetAssignment> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: ['questionSet'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.questionSet.clinic_id !== clinicId) {
      throw new NotFoundException('Assignment not found');
    }

    // Recalculate priority if assignment criteria changed
    if (
      updateAssignmentDto.service_id !== undefined ||
      updateAssignmentDto.doctor_id !== undefined ||
      updateAssignmentDto.specialty !== undefined ||
      updateAssignmentDto.appoint_type !== undefined ||
      updateAssignmentDto.branch_id !== undefined
    ) {
      const finalServiceId =
        updateAssignmentDto.service_id !== undefined
          ? updateAssignmentDto.service_id
          : assignment.service_id;
      const finalDoctorId =
        updateAssignmentDto.doctor_id !== undefined
          ? updateAssignmentDto.doctor_id
          : assignment.doctor_id;
      const finalSpecialty =
        updateAssignmentDto.specialty !== undefined
          ? updateAssignmentDto.specialty
          : assignment.specialty;
      const finalAppointType =
        updateAssignmentDto.appoint_type !== undefined
          ? updateAssignmentDto.appoint_type
          : assignment.appoint_type;
      const finalBranchId =
        updateAssignmentDto.branch_id !== undefined
          ? updateAssignmentDto.branch_id
          : assignment.branch_id;

      if (updateAssignmentDto.priority === undefined) {
        if (finalServiceId) {
          updateAssignmentDto.priority = 5;
        } else if (finalDoctorId) {
          updateAssignmentDto.priority = 4;
        } else if (finalSpecialty) {
          updateAssignmentDto.priority = 3;
        } else if (finalAppointType) {
          updateAssignmentDto.priority = 2;
        } else if (finalBranchId) {
          updateAssignmentDto.priority = 1;
        } else {
          updateAssignmentDto.priority = 0;
        }
      }
    }

    Object.assign(assignment, updateAssignmentDto);
    return this.assignmentsRepository.save(assignment);
  }

  async removeAssignment(clinicId: number, id: number): Promise<void> {
    const assignment = await this.assignmentsRepository.findOne({
      where: { id },
      relations: ['questionSet'],
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    if (assignment.questionSet.clinic_id !== clinicId) {
      throw new NotFoundException('Assignment not found');
    }

    await this.assignmentsRepository.remove(assignment);
  }

  /**
   * Get the appropriate question set for a booking based on priority rules
   * Priority: Service(5) > Doctor(4) > Specialty(3) > VisitType(2) > Branch(1)
   * If multiple match at same level, use highest priority number
   */
  async getQuestionSetForBooking(
    clinicId: number,
    params: {
      doctor_id?: number;
      service_id?: number;
      specialty?: string;
      appoint_type?: AppointType;
      branch_id?: number;
    },
  ): Promise<QuestionSet | null> {
    const { doctor_id, service_id, specialty, appoint_type, branch_id } =
      params;

    // Get doctor info if doctor_id provided
    let doctorSpecialty: string | null = null;
    let doctorBranchId: number | null = null;
    if (doctor_id) {
      const doctor = await this.doctorsRepository.findOne({
        where: { id: doctor_id, clinic_id: clinicId },
      });
      if (doctor) {
        doctorSpecialty = doctor.specialty || null;
        doctorBranchId = doctor.branch_id || null;
      }
    }

    // Build query to find matching assignments
    // An assignment matches if all its non-NULL criteria match the booking parameters
    // NULL in assignment means "match any value"
    const queryBuilder = this.assignmentsRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.questionSet', 'questionSet')
      .leftJoinAndSelect('questionSet.questions', 'questions')
      .where('questionSet.clinic_id = :clinicId', { clinicId })
      .andWhere('questionSet.is_active = :isActive', { isActive: true });

    // Service: match if assignment.service_id is NULL (any service) or matches booking service
    if (service_id !== undefined) {
      queryBuilder.andWhere(
        '(assignment.service_id IS NULL OR assignment.service_id = :serviceId)',
        { serviceId: service_id },
      );
    } else {
      queryBuilder.andWhere('assignment.service_id IS NULL');
    }

    // Doctor: match if assignment.doctor_id is NULL (any doctor) or matches booking doctor
    if (doctor_id !== undefined) {
      queryBuilder.andWhere(
        '(assignment.doctor_id IS NULL OR assignment.doctor_id = :doctorId)',
        { doctorId: doctor_id },
      );
    } else {
      queryBuilder.andWhere('assignment.doctor_id IS NULL');
    }

    // Specialty: match if assignment.specialty is NULL (any specialty) or matches booking specialty
    const targetSpecialty = specialty || doctorSpecialty;
    if (targetSpecialty !== undefined && targetSpecialty !== null) {
      queryBuilder.andWhere(
        '(assignment.specialty IS NULL OR assignment.specialty = :specialty)',
        { specialty: targetSpecialty },
      );
    } else {
      queryBuilder.andWhere('assignment.specialty IS NULL');
    }

    // Visit type: match if assignment.appoint_type is NULL (any type) or matches booking type
    if (appoint_type !== undefined) {
      queryBuilder.andWhere(
        '(assignment.appoint_type IS NULL OR assignment.appoint_type = :appointType)',
        { appointType: appoint_type },
      );
    } else {
      queryBuilder.andWhere('assignment.appoint_type IS NULL');
    }

    // Branch: match if assignment.branch_id is NULL (any branch) or matches booking branch
    const targetBranchId = branch_id || doctorBranchId;
    if (targetBranchId !== undefined) {
      queryBuilder.andWhere(
        '(assignment.branch_id IS NULL OR assignment.branch_id = :branchId)',
        { branchId: targetBranchId },
      );
    } else {
      queryBuilder.andWhere('assignment.branch_id IS NULL');
    }

    // Get all matching assignments
    const assignments = await queryBuilder
      .orderBy('assignment.priority', 'DESC')
      .getMany();

    if (assignments.length === 0) {
      return null;
    }

    // Filter to only exact matches
    // An assignment is an exact match if all its non-null criteria match the booking parameters
    const exactMatches = assignments.filter((assignment) => {
      // If assignment specifies a service, it must match
      if (assignment.service_id !== null && assignment.service_id !== service_id) {
        return false;
      }
      // If assignment specifies a doctor, it must match
      if (assignment.doctor_id !== null && assignment.doctor_id !== doctor_id) {
        return false;
      }
      // If assignment specifies a specialty, it must match
      if (assignment.specialty !== null) {
        const targetSpecialty = specialty || doctorSpecialty;
        if (assignment.specialty !== targetSpecialty) {
          return false;
        }
      }
      // If assignment specifies an appoint type, it must match
      if (assignment.appoint_type !== null && assignment.appoint_type !== appoint_type) {
        return false;
      }
      // If assignment specifies a branch, it must match
      if (assignment.branch_id !== null) {
        const targetBranchId = branch_id || doctorBranchId;
        if (assignment.branch_id !== targetBranchId) {
          return false;
        }
      }
      return true;
    });

    // Return the highest priority match (already sorted by priority DESC)
    if (exactMatches.length > 0) {
      return exactMatches[0].questionSet;
    }

    // Fall back to best partial match if no exact matches
    return assignments[0].questionSet;
  }
}
