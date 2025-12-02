import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPermissionsFromEnum1765000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Define all permissions from the Permission enum with proper names and descriptions
    const enumPermissions = [
      // User permissions
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
      // Role permissions
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
      // Permission permissions
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
      // Package permissions
      {
        name: 'Create Package',
        slug: 'create-package',
        description: 'Allows creating new packages',
      },
      {
        name: 'Read Package',
        slug: 'read-package',
        description: 'Allows reading package information',
      },
      {
        name: 'Update Package',
        slug: 'update-package',
        description: 'Allows updating package information',
      },
      {
        name: 'Delete Package',
        slug: 'delete-package',
        description: 'Allows deleting packages',
      },
    ];

    // Get all existing permissions from the database
    const existingPermissions = await queryRunner.query(
      `SELECT slug FROM permissions`,
    );

    const existingSlugs = existingPermissions.map(
      (p: { slug: string }) => p.slug,
    );

    // Add missing permissions
    let createdCount = 0;
    let skippedCount = 0;

    for (const perm of enumPermissions) {
      // Check if permission already exists
      if (existingSlugs.includes(perm.slug)) {
        skippedCount++;
        continue;
      }

      // Double-check by querying the database
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

        console.log(`Created permission: ${perm.slug}`);
        createdCount++;
      } else {
        skippedCount++;
      }
    }

    if (createdCount > 0) {
      console.log(
        `Successfully created ${createdCount} missing permission(s) from enum.`,
      );
    }

    if (skippedCount > 0) {
      console.log(
        `Skipped ${skippedCount} permission(s) (already exist in database).`,
      );
    }

    if (createdCount === 0 && skippedCount === enumPermissions.length) {
      console.log(
        'All permissions from enum are already present in the database.',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get all permission slugs from the enum
    const enumPermissionSlugs = [
      'create-user',
      'read-user',
      'update-user',
      'delete-user',
      'create-role',
      'read-role',
      'update-role',
      'delete-role',
      'create-permission',
      'read-permission',
      'update-permission',
      'delete-permission',
      'create-package',
      'read-package',
      'update-package',
      'delete-package',
    ];

    // Remove role-permission relationships first
    const placeholders = enumPermissionSlugs.map(() => '?').join(',');
    const permissions = await queryRunner.query(
      `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
      enumPermissionSlugs,
    );

    if (permissions.length > 0) {
      for (const permission of permissions) {
        await queryRunner.query(
          `DELETE FROM role_permissions WHERE permission_id = ?`,
          [permission.id],
        );
      }
    }

    // Delete permissions
    await queryRunner.query(
      `DELETE FROM permissions WHERE slug IN (${placeholders})`,
      enumPermissionSlugs,
    );

    console.log('Removed permissions from enum from the database.');
    console.log(
      'Warning: This removes all enum permissions. Use with caution in production.',
    );
  }
}
