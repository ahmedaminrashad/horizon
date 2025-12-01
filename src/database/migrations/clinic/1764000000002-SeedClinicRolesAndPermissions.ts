import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedClinicRolesAndPermissions1764000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create clinic-specific permissions
    const permissions = [
      {
        name: 'Create Doctor',
        slug: 'create-doctor',
        description: 'Allows creating new doctors',
      },
      {
        name: 'Read Doctor',
        slug: 'read-doctor',
        description: 'Allows reading doctor information',
      },
      {
        name: 'Update Doctor',
        slug: 'update-doctor',
        description: 'Allows updating doctor information',
      },
      {
        name: 'Delete Doctor',
        slug: 'delete-doctor',
        description: 'Allows deleting doctors',
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
        name: 'Manage Clinic',
        slug: 'manage-clinic',
        description: 'Allows managing clinic settings and data',
      },
    ];

    const createdPermissionIds: number[] = [];

    for (const perm of permissions) {
      // Check if permission already exists
      const existingPermission = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug = ? LIMIT 1`,
        [perm.slug],
      );

      if (existingPermission.length === 0) {
        // Insert permission
        await queryRunner.query(
          `INSERT INTO permissions (name, slug, description, createdAt, updatedAt) 
           VALUES (?, ?, ?, NOW(), NOW())`,
          [perm.name, perm.slug, perm.description],
        );

        // Get the created permission ID
        const [newPermission] = await queryRunner.query(
          `SELECT id FROM permissions WHERE slug = ? LIMIT 1`,
          [perm.slug],
        );

        if (newPermission) {
          createdPermissionIds.push(newPermission.id);
          console.log(`Created permission: ${perm.slug}`);
        }
      } else {
        createdPermissionIds.push(existingPermission[0].id);
        console.log(`Permission already exists: ${perm.slug}`);
      }
    }

    // Create clinic roles
    const roles = [
      {
        name: 'Doctor',
        slug: 'doctor',
        description: 'Doctor role for healthcare professionals',
        permissionSlugs: [
          'read-doctor',
          'read-user',
          'update-user',
          'manage-clinic',
        ],
      },
      {
        name: 'Clinic Admin',
        slug: 'clinic-admin',
        description: 'Clinic administrator with full access',
        permissionSlugs: [
          'create-doctor',
          'read-doctor',
          'update-doctor',
          'delete-doctor',
          'create-user',
          'read-user',
          'update-user',
          'delete-user',
          'manage-clinic',
        ],
      },
      {
        name: 'Staff',
        slug: 'staff',
        description: 'Clinic staff member',
        permissionSlugs: ['read-doctor', 'read-user', 'update-user'],
      },
    ];

    for (const roleData of roles) {
      // Check if role already exists
      const existingRole = await queryRunner.query(
        `SELECT id FROM roles WHERE slug = ? LIMIT 1`,
        [roleData.slug],
      );

      let roleId: number;

      if (existingRole.length === 0) {
        // Insert role
        await queryRunner.query(
          `INSERT INTO roles (name, slug, description, createdAt, updatedAt) 
           VALUES (?, ?, ?, NOW(), NOW())`,
          [roleData.name, roleData.slug, roleData.description],
        );

        // Get the created role ID
        const [newRole] = await queryRunner.query(
          `SELECT id FROM roles WHERE slug = ? LIMIT 1`,
          [roleData.slug],
        );

        roleId = newRole.id;
        console.log(`Created role: ${roleData.slug}`);
      } else {
        roleId = existingRole[0].id;
        console.log(`Role already exists: ${roleData.slug}`);
      }

      // Get permission IDs for the role
      const placeholders = roleData.permissionSlugs.map(() => '?').join(',');
      const permissionIds = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
        roleData.permissionSlugs,
      );

      for (const permission of permissionIds) {
        // Check if the relationship already exists
        const existingRelation = await queryRunner.query(
          `SELECT * FROM role_permissions 
           WHERE role_id = ? AND permission_id = ? 
           LIMIT 1`,
          [roleId, permission.id],
        );

        if (existingRelation.length === 0) {
          await queryRunner.query(
            `INSERT INTO role_permissions (role_id, permission_id) 
             VALUES (?, ?)`,
            [roleId, permission.id],
          );
        }
      }

      console.log(
        `Assigned ${permissionIds.length} permissions to role: ${roleData.slug}`,
      );
    }

    console.log('Clinic roles and permissions seeded successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role-permission relationships
    const clinicRoles = await queryRunner.query(
      `SELECT id FROM roles WHERE slug IN ('doctor', 'clinic-admin', 'staff')`,
    );

    for (const role of clinicRoles) {
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE role_id = ?`,
        [role.id],
      );
    }

    // Delete clinic roles
    await queryRunner.query(
      `DELETE FROM roles WHERE slug IN ('doctor', 'clinic-admin', 'staff')`,
    );

    // Delete clinic permissions
    await queryRunner.query(
      `DELETE FROM permissions WHERE slug IN ('create-doctor', 'read-doctor', 'update-doctor', 'delete-doctor', 'create-user', 'read-user', 'update-user', 'delete-user', 'manage-clinic')`,
    );

    console.log('Clinic roles and permissions removed');
  }
}
