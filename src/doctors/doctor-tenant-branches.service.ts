import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import { Branch } from '../branches/entities/branch.entity';
import { Clinic } from '../clinics/entities/clinic.entity';
import { DoctorBranch } from '../clinic/doctor-branches/entities/doctor-branch.entity';
import { TenantDataSourceService } from '../database/tenant-data-source.service';
import { DayOfWeek } from '../clinic/working-hours/entities/working-hour.entity';

/** One row from tenant `doctor_branches` plus branch display fields. */
export interface DoctorBranchPivotDto {
  /** Tenant branch id (`doctor_branches.branch_id`). */
  branch_id: number;
  /** Main `branches.id` when `branches.clinic_branch_id` matches `branch_id`. */
  main_branch_id: number | null;
  week_start_day: DayOfWeek | null;
  week_end_day: DayOfWeek | null;
  from_time: string | null;
  to_time: string | null;
  /** Tenant branch display name (`branches.name` in clinic DB). */
  name: string | null;
  /** Optional fee from pivot (`doctor_branches.fees`). */
  fees: number | null;
}

@Injectable()
export class DoctorTenantBranchesService {
  constructor(
    @InjectRepository(Clinic)
    private readonly clinicsRepository: Repository<Clinic>,
    @InjectRepository(Branch)
    private readonly branchesRepository: Repository<Branch>,
    private readonly tenantDataSourceService: TenantDataSourceService,
  ) {}

  /**
   * Loads tenant `doctor_branches` rows (week range + daily window + branch names)
   * keyed by main doctor `clinic_doctor_id`, and attaches them as `branches` on each doctor.
   */
  async attachDoctorBranchesFromTenant<
    T extends Pick<Doctor, 'clinic_id' | 'clinic_doctor_id'>,
  >(doctors: T[]): Promise<Array<T & { branches: DoctorBranchPivotDto[] }>> {
    if (!doctors.length) {
      return [];
    }
    const byClinic = new Map<number, T[]>();
    for (const d of doctors) {
      const list = byClinic.get(d.clinic_id) ?? [];
      list.push(d);
      byClinic.set(d.clinic_id, list);
    }

    const pivotByClinicDoctorId = new Map<string, DoctorBranchPivotDto[]>();
    const key = (clinicId: number, clinicDoctorId: number) =>
      `${clinicId}:${clinicDoctorId}`;

    for (const [clinicId, list] of byClinic) {
      const clinicDoctorIds = [
        ...new Set(list.map((d) => d.clinic_doctor_id).filter((id) => id != null)),
      ] as number[];
      if (!clinicDoctorIds.length) {
        for (const d of list) {
          pivotByClinicDoctorId.set(key(clinicId, d.clinic_doctor_id), []);
        }
        continue;
      }

      const clinic = await this.clinicsRepository.findOne({
        where: { id: clinicId },
        select: ['id', 'database_name'],
      });
      const dbName = clinic?.database_name?.trim();
      if (!dbName) {
        for (const d of list) {
          pivotByClinicDoctorId.set(key(clinicId, d.clinic_doctor_id), []);
        }
        continue;
      }

      const tenantDs =
        await this.tenantDataSourceService.getTenantDataSource(dbName);
      if (!tenantDs) {
        for (const d of list) {
          pivotByClinicDoctorId.set(key(clinicId, d.clinic_doctor_id), []);
        }
        continue;
      }

      const mainBranches = await this.branchesRepository.find({
        where: { clinic_id: clinicId },
        select: ['id', 'clinic_branch_id'],
      });
      const tenantBranchIdToMainId = new Map<number, number>();
      for (const b of mainBranches) {
        if (b.clinic_branch_id != null) {
          tenantBranchIdToMainId.set(Number(b.clinic_branch_id), b.id);
        }
      }

      const pivotRepo = tenantDs.getRepository(DoctorBranch);
      const rows = await pivotRepo.find({
        where: { doctor_id: In(clinicDoctorIds) },
        relations: ['branch'],
        order: { id: 'ASC' },
      });

      for (const id of clinicDoctorIds) {
        pivotByClinicDoctorId.set(key(clinicId, id), []);
      }
      for (const row of rows) {
        const tenantBranchId = row.branch_id;
        const dto: DoctorBranchPivotDto = {
          branch_id: tenantBranchId,
          main_branch_id: tenantBranchIdToMainId.get(tenantBranchId) ?? null,
          week_start_day: row.week_start_day ?? null,
          week_end_day: row.week_end_day ?? null,
          from_time: row.from_time ?? null,
          to_time: row.to_time ?? null,
          name: row.branch?.name ?? null,
          fees: row.fees != null ? Number(row.fees) : null,
        };
        const k = key(clinicId, row.doctor_id);
        const arr = pivotByClinicDoctorId.get(k);
        if (arr) arr.push(dto);
      }
    }

    return doctors.map((d) => ({
      ...d,
      branches:
        pivotByClinicDoctorId.get(key(d.clinic_id, d.clinic_doctor_id)) ?? [],
    }));
  }
}
