/**
 * Permission enum based on permission slugs
 * This enum should match the permission slugs in the database
 */
export enum Permission {
  // User permissions
  CREATE_USER = 'create-user',
  READ_USER = 'read-user',
  UPDATE_USER = 'update-user',
  DELETE_USER = 'delete-user',

  // Role permissions
  CREATE_ROLE = 'create-role',
  READ_ROLE = 'read-role',
  UPDATE_ROLE = 'update-role',
  DELETE_ROLE = 'delete-role',

  // Permission permissions
  CREATE_PERMISSION = 'create-permission',
  READ_PERMISSION = 'read-permission',
  UPDATE_PERMISSION = 'update-permission',
  DELETE_PERMISSION = 'delete-permission',

  // Package permissions
  CREATE_PACKAGE = 'create-package',
  READ_PACKAGE = 'read-package',
  UPDATE_PACKAGE = 'update-package',
  DELETE_PACKAGE = 'delete-package',

  // Settings permissions
  READ_SETTING = 'read-setting',
  UPDATE_SETTING = 'update-setting',

  // Clinic permissions
  CREATE_CLINIC = 'create-clinic',
  READ_CLINIC = 'read-clinic',
  UPDATE_CLINIC = 'update-clinic',
  DELETE_CLINIC = 'delete-clinic',
}
