import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { DoctorsModule } from './doctors/doctors.module';
import { ClinicAuthModule } from './auth/clinic-auth.module';
import { SlotTemplateModule } from './slot-template/slot-template.module';
import { ClinicSettingsModule } from './settings/settings.module';
import { ReservationsModule } from './reservations/reservations.module';
import { ClinicUsersModule } from './users/clinic-users.module';
import { ClinicServicesModule } from './services/services.module';
import { BranchesModule } from './branches/branches.module';
import { WorkingHoursModule } from './working-hours/working-hours.module';
import { QuestionsModule } from './questions/questions.module';
import { PatientQuestionAnswersModule } from './patient-question-answers/patient-question-answers.module';
import { ClinicRolesModule } from './roles/clinic-roles.module';
import { ClinicPermissionsModule } from './permissions/clinic-permissions.module';
import { ClinicTenantInterceptor } from './interceptors/clinic-tenant.interceptor';
import { DatabaseModule } from '../database/database.module';
import { UsersModule } from '../users/users.module';
import { ClinicsModule } from '../clinics/clinics.module';

@Module({
  imports: [DoctorsModule, ClinicAuthModule, SlotTemplateModule, ClinicSettingsModule, ReservationsModule, ClinicUsersModule, ClinicServicesModule, BranchesModule, WorkingHoursModule, QuestionsModule, PatientQuestionAnswersModule, ClinicRolesModule, ClinicPermissionsModule, DatabaseModule, UsersModule, ClinicsModule],
  exports: [DoctorsModule, ClinicAuthModule, SlotTemplateModule, ClinicSettingsModule, ReservationsModule, ClinicUsersModule, ClinicServicesModule, BranchesModule, WorkingHoursModule, QuestionsModule, PatientQuestionAnswersModule, ClinicRolesModule, ClinicPermissionsModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ClinicTenantInterceptor,
    },
  ],
})
export class ClinicModule {}
