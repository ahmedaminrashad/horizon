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
}
