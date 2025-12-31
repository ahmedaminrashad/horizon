import { DataSource } from 'typeorm';
import { Role } from '../../clinic/permissions/entities/role.entity';
import { Permission } from '../../clinic/permissions/entities/permission.entity';
import { ClinicPermission } from '../../clinic/permissions/enums/clinic-permission.enum';

/**
 * Seed roles and permissions for a clinic database
 * This should be run after clinic migrations are executed
 * Usage: Create a DataSource for the clinic database and call this function
 */
export async function seedClinicRolesAndPermissions(
  dataSource: DataSource,
): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  // Create Permissions based on ClinicPermission enum
  const permissions = [
    {
      name: 'Super',
      slug: 'super',
      description: 'Grants access to everything - bypasses all permission checks',
    },
    {
      name: 'Create Doctor',
      slug: ClinicPermission.CREATE_DOCTOR,
      description: 'Allows creating new doctors',
    },
    {
      name: 'Read Doctor',
      slug: ClinicPermission.READ_DOCTOR,
      description: 'Allows reading doctor information',
    },
    {
      name: 'Update Doctor',
      slug: ClinicPermission.UPDATE_DOCTOR,
      description: 'Allows updating doctor information',
    },
    {
      name: 'Delete Doctor',
      slug: ClinicPermission.DELETE_DOCTOR,
      description: 'Allows deleting doctors',
    },
    {
      name: 'Create User',
      slug: ClinicPermission.CREATE_USER,
      description: 'Allows creating new clinic users',
    },
    {
      name: 'Read User',
      slug: ClinicPermission.READ_USER,
      description: 'Allows reading clinic user information',
    },
    {
      name: 'Update User',
      slug: ClinicPermission.UPDATE_USER,
      description: 'Allows updating clinic user information',
    },
    {
      name: 'Delete User',
      slug: ClinicPermission.DELETE_USER,
      description: 'Allows deleting clinic users',
    },
    {
      name: 'Manage Clinic',
      slug: ClinicPermission.MANAGE_CLINIC,
      description: 'Allows managing clinic settings and configuration',
    },
    {
      name: 'Read Setting',
      slug: ClinicPermission.READ_SETTING,
      description: 'Allows reading clinic settings',
    },
    {
      name: 'Update Setting',
      slug: ClinicPermission.UPDATE_SETTING,
      description: 'Allows updating clinic settings',
    },
    {
      name: 'Create Reservation',
      slug: ClinicPermission.CREATE_RESERVATION,
      description: 'Allows creating new reservations',
    },
    {
      name: 'Read Reservation',
      slug: ClinicPermission.READ_RESERVATION,
      description: 'Allows reading reservation information',
    },
    {
      name: 'Update Reservation',
      slug: ClinicPermission.UPDATE_RESERVATION,
      description: 'Allows updating reservation information',
    },
    {
      name: 'Delete Reservation',
      slug: ClinicPermission.DELETE_RESERVATION,
      description: 'Allows deleting reservations',
    },
    {
      name: 'Create Branch',
      slug: ClinicPermission.CREATE_BRANCH,
      description: 'Allows creating new branches',
    },
    {
      name: 'Read Branch',
      slug: ClinicPermission.READ_BRANCH,
      description: 'Allows reading branch information',
    },
    {
      name: 'Update Branch',
      slug: ClinicPermission.UPDATE_BRANCH,
      description: 'Allows updating branch information',
    },
    {
      name: 'Delete Branch',
      slug: ClinicPermission.DELETE_BRANCH,
      description: 'Allows deleting branches',
    },
  ];

  const createdPermissions: Permission[] = [];
  for (const perm of permissions) {
    let permission = await permissionRepository.findOne({
      where: { slug: perm.slug },
    });
    if (!permission) {
      permission = permissionRepository.create(perm);
      permission = await permissionRepository.save(permission);
      console.log(`Created permission: ${perm.slug}`);
    } else {
      console.log(`Permission already exists: ${perm.slug}`);
    }
    createdPermissions.push(permission);
  }

  // Create Roles
  const roles = [
    {
      name: 'Admin',
      slug: 'admin',
      description: 'Clinic administrator role with full access',
      permissionSlugs: permissions.map((p) => p.slug), // All permissions
    },
    {
      name: 'Manager',
      slug: 'manager',
      description: 'Clinic manager role with management access',
      permissionSlugs: [
        'read-doctor',
        'create-doctor',
        'update-doctor',
        'read-user',
        'create-user',
        'update-user',
        'read-reservation',
        'create-reservation',
        'update-reservation',
        'read-branch',
        'create-branch',
        'update-branch',
        'read-setting',
        'update-setting',
      ],
    },
    {
      name: 'Receptionist',
      slug: 'receptionist',
      description: 'Receptionist role for managing reservations',
      permissionSlugs: [
        'read-doctor',
        'read-user',
        'read-reservation',
        'create-reservation',
        'update-reservation',
        'read-branch',
      ],
    },
    {
      name: 'Doctor',
      slug: 'doctor',
      description: 'Doctor role with limited access',
      permissionSlugs: [
        'read-doctor',
        'update-doctor',
        'read-reservation',
        'update-reservation',
        'read-branch',
      ],
    },
    {
      name: 'User',
      slug: 'user',
      description: 'Regular clinic user role',
      permissionSlugs: ['read-user', 'read-reservation'],
    },
  ];

  for (const roleData of roles) {
    let role = await roleRepository.findOne({ where: { slug: roleData.slug } });
    if (!role) {
      role = roleRepository.create({
        name: roleData.name,
        slug: roleData.slug,
        description: roleData.description,
      });
      role = await roleRepository.save(role);
      console.log(`Created role: ${roleData.slug}`);
    } else {
      console.log(`Role already exists: ${roleData.slug}`);
    }

    // Assign permissions to role
    const rolePermissions = createdPermissions.filter((p) =>
      roleData.permissionSlugs.includes(p.slug),
    );
    role.permissions = rolePermissions;
    await roleRepository.save(role);
    console.log(
      `Assigned ${rolePermissions.length} permissions to role: ${roleData.slug}`,
    );
  }

  console.log('Clinic roles and permissions seeded successfully!');
}

