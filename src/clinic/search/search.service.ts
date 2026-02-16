import { Injectable } from '@nestjs/common';
import { ClinicsService } from '../../clinics/clinics.service';
import { DoctorsService } from '../doctors/doctors.service';
import { ReservationsService } from '../reservations/reservations.service';
import { ClinicUsersService } from '../users/clinic-users.service';

export interface GlobalSearchResult {
  doctors: unknown[];
  patients: unknown[];
  reservations: unknown[];
  users: unknown[];
}

@Injectable()
export class SearchService {
  constructor(
    private readonly clinicsService: ClinicsService,
    private readonly doctorsService: DoctorsService,
    private readonly reservationsService: ReservationsService,
    private readonly clinicUsersService: ClinicUsersService,
  ) {}

  /**
   * Smart search across doctors, patients, reservations, and users for the given clinic.
   * Returns up to `limit` items per type (default 5).
   */
  async globalSearch(
    clinicId: number,
    q: string,
    limit: number = 5,
  ): Promise<GlobalSearchResult> {
    const term = (q ?? '').trim();
    const take = Math.min(Math.max(limit || 5, 1), 20);

    const [doctorsRes, patientsArr, reservationsRes, usersRes] = await Promise.all([
      term
        ? this.doctorsService.findAll(clinicId, 1, take, term, undefined)
        : Promise.resolve({ data: [], meta: { total: 0 } }),
      term
        ? this.clinicsService.getClinicPatients(clinicId, { search: term })
        : Promise.resolve([]),
      term
        ? this.reservationsService.findAll(clinicId, 1, take, {
            search: term,
          })
        : Promise.resolve({ data: [], meta: { total: 0 } }),
      term
        ? this.clinicUsersService.findAll(clinicId, 1, take, { search: term })
        : Promise.resolve({ data: [], meta: { total: 0 } }),
    ]);

    const patients = Array.isArray(patientsArr)
      ? patientsArr.slice(0, take)
      : [];
    const doctors = Array.isArray(doctorsRes?.data) ? doctorsRes.data : [];
    const reservations =
      reservationsRes?.data && Array.isArray(reservationsRes.data)
        ? reservationsRes.data
        : [];
    const users = Array.isArray(usersRes?.data) ? usersRes.data : [];

    return {
      doctors,
      patients,
      reservations,
      users,
    };
  }
}
