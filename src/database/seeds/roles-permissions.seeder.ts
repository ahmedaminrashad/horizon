import { DataSource } from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from '../../permissions/entities/permission.entity';

export async function seedRolesAndPermissions(
  dataSource: DataSource,
): Promise<void> {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  // Create Permissions
  const permissions = [
    {
      name: 'Super',
      slug: 'super',
      description: 'Grants access to everything - bypasses all permission checks',
    },
    {
      name: 'Create User',
      slug: 'create-user',
      description: 'Allows creating new users',
    },
    {
      name: 'Read User',
      slug: 'read-user',
      description: 'Allows reading user information',
    },
    {
      name: 'Update User',
      slug: 'update-user',
      description: 'Allows updating user information',
    },
    {
      name: 'Delete User',
      slug: 'delete-user',
      description: 'Allows deleting users',
    },
    {
      name: 'Create Role',
      slug: 'create-role',
      description: 'Allows creating new roles',
    },
    {
      name: 'Read Role',
      slug: 'read-role',
      description: 'Allows reading role information',
    },
    {
      name: 'Update Role',
      slug: 'update-role',
      description: 'Allows updating role information',
    },
    {
      name: 'Delete Role',
      slug: 'delete-role',
      description: 'Allows deleting roles',
    },
    {
      name: 'Create Permission',
      slug: 'create-permission',
      description: 'Allows creating new permissions',
    },
    {
      name: 'Read Permission',
      slug: 'read-permission',
      description: 'Allows reading permission information',
    },
    {
      name: 'Update Permission',
      slug: 'update-permission',
      description: 'Allows updating permission information',
    },
    {
      name: 'Delete Permission',
      slug: 'delete-permission',
      description: 'Allows deleting permissions',
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
      description: 'Administrator role with full access',
      permissionSlugs: permissions.map((p) => p.slug), // All permissions
    },
    {
      name: 'User',
      slug: 'user',
      description: 'Regular user role',
      permissionSlugs: ['read-user'], // Limited permissions
    },
    {
      name: 'Moderator',
      slug: 'moderator',
      description: 'Moderator role with moderate access',
      permissionSlugs: [
        'read-user',
        'update-user',
        'read-role',
        'read-permission',
      ],
    },
    {
      name: 'Clinic',
      slug: 'clinic',
      description: 'Clinic role with own database',
      permissionSlugs: ['read-user', 'create-user', 'update-user', 'read-role'],
    },
    {
      name: 'Patient',
      slug: 'patient',
      description: 'Patient role for healthcare patients',
      permissionSlugs: ['read-user'], // Limited permissions for patients
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

  console.log('Roles and permissions seeded successfully!');
}
