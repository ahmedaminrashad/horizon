/**
 * Clinic-specific permission enum
 * These permissions are stored in each clinic's database
 */
export enum ClinicPermission {
  // Doctor permissions
  CREATE_DOCTOR = 'create-doctor',
  READ_DOCTOR = 'read-doctor',
  UPDATE_DOCTOR = 'update-doctor',
  DELETE_DOCTOR = 'delete-doctor',

  // User permissions (clinic users)
  CREATE_USER = 'create-user',
  READ_USER = 'read-user',
  UPDATE_USER = 'update-user',
  DELETE_USER = 'delete-user',

  // Clinic management
  MANAGE_CLINIC = 'manage-clinic',

  // Settings permissions
  READ_SETTING = 'read-setting',
  UPDATE_SETTING = 'update-setting',

  // Reservation permissions
  CREATE_RESERVATION = 'create-reservation',
  READ_RESERVATION = 'read-reservation',
  UPDATE_RESERVATION = 'update-reservation',
  DELETE_RESERVATION = 'delete-reservation',

  // Branch permissions
  CREATE_BRANCH = 'create-branch',
  READ_BRANCH = 'read-branch',
  UPDATE_BRANCH = 'update-branch',
  DELETE_BRANCH = 'delete-branch',
}
