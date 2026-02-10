import { MigrationInterface } from 'typeorm';
import { CreateUsersTable1699123456789 } from './1699123456789-CreateUsersTable';
import { Addnametousers1762807516112 } from './1762807516112-Addnametousers';
import { CreateDoctorsTable1764000000000 } from './1764000000000-CreateDoctorsTable';
import { CreateRolesAndPermissionsTables1764000000001 } from './1764000000001-CreateRolesAndPermissionsTables';
import { SeedClinicRolesAndPermissions1764000000002 } from './1764000000002-SeedClinicRolesAndPermissions';
import { CreateSlotTemplateTable1764000000003 } from './1764000000003-CreateSlotTemplateTable';
import { AddDoctorIdToSlotTemplate1764000000004 } from './1764000000004-AddDoctorIdToSlotTemplate';
import { CreateSettingsTable1766000000000 } from './1766000000000-CreateSettingsTable';
import { AddSettingsPermissions1766000000001 } from './1766000000001-AddSettingsPermissions';
import { SeedClinicSettings1766000000002 } from './1766000000002-SeedClinicSettings';
import { CreateReservationsTable1767000000000 } from './1767000000000-CreateReservationsTable';
import { AddReservationPermissions1767000000001 } from './1767000000001-AddReservationPermissions';
import { AddRateAndAvatarToDoctors1768000000000 } from './1768000000000-AddRateAndAvatarToDoctors';
import { AddFieldsToClinicDoctors1769000000000 } from './1769000000000-AddFieldsToClinicDoctors';
import { CreateServicesTable1771000000000 } from './1771000000000-CreateServicesTable';
import { CreateBranchesTable1772000000000 } from './1772000000000-CreateBranchesTable';
import { AddBranchPermissions1773000000000 } from './1773000000000-AddBranchPermissions';
import { AddMoreFieldsToClinicDoctors1774000000002 } from './1774000000002-AddMoreFieldsToClinicDoctors';
import { CreateWorkingHoursTable1775000000000 } from './1775000000000-CreateWorkingHoursTable';
import { CreateBreakHoursTable1775000000001 } from './1775000000001-CreateBreakHoursTable';
import { CreateDoctorWorkingHoursTable1775000000002 } from './1775000000002-CreateDoctorWorkingHoursTable';
import { AddBranchIdToWorkingHours1776000000000 } from './1776000000000-AddBranchIdToWorkingHours';
import { AddBranchIdToBreakHours1776000000001 } from './1776000000001-AddBranchIdToBreakHours';
import { AddSessionTimeToDoctorWorkingHours1776000000002 } from './1776000000002-AddSessionTimeToDoctorWorkingHours';
import { AddDoctorWorkingHourIdToReservations1776000000003 } from './1776000000003-AddDoctorWorkingHourIdToReservations';
import { AddFeesToDoctorWorkingHours1776000000004 } from './1776000000004-AddFeesToDoctorWorkingHours';
import { MakeFeesRequiredInDoctorWorkingHours1776000000005 } from './1776000000005-MakeFeesRequiredInDoctorWorkingHours';
import { AddBusyAndPatientsLimitToDoctorWorkingHours1776000000006 } from './1776000000006-AddBusyAndPatientsLimitToDoctorWorkingHours';
import { ChangeReservationDateTimeToDate1776000000007 } from './1776000000007-ChangeReservationDateTimeToDate';
import { AddMainUserIdToReservations1776000000008 } from './1776000000008-AddMainUserIdToReservations';
import { AddAppointTypeToDoctorWorkingHours1776000000009 } from './1776000000009-AddAppointTypeToDoctorWorkingHours';
import { AddAppointTypeToReservations1776000000010 } from './1776000000010-AddAppointTypeToReservations';
import { RenameDefaultDurationToDefaultDurationMinutes1776000000014 } from './1776000000014-RenameDefaultDurationToDefaultDurationMinutes';
import { DropQuestionSetsTables1776000000015 } from './1776000000015-DropQuestionSetsTables';
import { CreateClinicQuestionsTable1776000000016 } from './1776000000016-CreateClinicQuestionsTable';
import { AddClinicIdToQuestions1776000000017 } from './1776000000017-AddClinicIdToQuestions';
import { CreatePatientQuestionAnswersTable1776000000018 } from './1776000000018-CreatePatientQuestionAnswersTable';
import { AddQuestionIdToPatientQuestionAnswers1776000000019 } from './1776000000019-AddQuestionIdToPatientQuestionAnswers';
import { CreateDoctorServicesTable1776000000021 } from './1776000000021-CreateDoctorServicesTable';
import { AddDoctorServiceIdToDoctorWorkingHours1776000000022 } from './1776000000022-AddDoctorServiceIdToDoctorWorkingHours';

/**
 * List of all clinic migrations in order
 * Add new migrations to this array in chronological order
 */
export const clinicMigrations: (new () => MigrationInterface)[] = [
  CreateUsersTable1699123456789,
  Addnametousers1762807516112,
  CreateDoctorsTable1764000000000,
  CreateRolesAndPermissionsTables1764000000001,
  SeedClinicRolesAndPermissions1764000000002,
  CreateSlotTemplateTable1764000000003,
  AddDoctorIdToSlotTemplate1764000000004,
  CreateSettingsTable1766000000000,
  AddSettingsPermissions1766000000001,
  SeedClinicSettings1766000000002,
  CreateReservationsTable1767000000000,
  AddReservationPermissions1767000000001,
  AddRateAndAvatarToDoctors1768000000000,
  AddFieldsToClinicDoctors1769000000000,
  CreateServicesTable1771000000000,
  CreateBranchesTable1772000000000,
  AddBranchPermissions1773000000000,
  AddMoreFieldsToClinicDoctors1774000000002,
  CreateWorkingHoursTable1775000000000,
  CreateBreakHoursTable1775000000001,
  CreateDoctorWorkingHoursTable1775000000002,
  AddBranchIdToWorkingHours1776000000000,
  AddBranchIdToBreakHours1776000000001,
  AddSessionTimeToDoctorWorkingHours1776000000002,
  AddDoctorWorkingHourIdToReservations1776000000003,
  AddFeesToDoctorWorkingHours1776000000004,
  MakeFeesRequiredInDoctorWorkingHours1776000000005,
  AddBusyAndPatientsLimitToDoctorWorkingHours1776000000006,
  ChangeReservationDateTimeToDate1776000000007,
  AddMainUserIdToReservations1776000000008,
  AddAppointTypeToDoctorWorkingHours1776000000009,
  AddAppointTypeToReservations1776000000010,
  RenameDefaultDurationToDefaultDurationMinutes1776000000014,
  DropQuestionSetsTables1776000000015,
  CreateClinicQuestionsTable1776000000016,
  AddClinicIdToQuestions1776000000017,
  CreatePatientQuestionAnswersTable1776000000018,
  AddQuestionIdToPatientQuestionAnswers1776000000019,
  CreateDoctorServicesTable1776000000021,
  AddDoctorServiceIdToDoctorWorkingHours1776000000022,
];
