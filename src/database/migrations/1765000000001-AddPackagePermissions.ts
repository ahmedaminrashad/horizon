import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPackagePermissions1765000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
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

        console.log(`Created permission: ${perm.slug}`);
      } else {
        console.log(`Permission already exists: ${perm.slug}`);
      }
    }

    // Assign all package permissions to admin role
    const adminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'admin' LIMIT 1`,
    );

    if (adminRole.length > 0) {
      const roleId = adminRole[0].id;

      // Get permission IDs for package permissions
      const packagePermissionSlugs = permissions.map((p) => p.slug);
      const placeholders = packagePermissionSlugs.map(() => '?').join(',');
      const permissionIds = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
        packagePermissionSlugs,
      );

      // Assign permissions to admin role
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
        `Assigned ${permissionIds.length} package permissions to admin role`,
      );
    }

    console.log('Package permissions added successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role-permission relationships for package permissions
    const packagePermissions = await queryRunner.query(
      `SELECT id FROM permissions WHERE slug IN ('create-package', 'read-package', 'update-package', 'delete-package')`,
    );

    for (const permission of packagePermissions) {
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE permission_id = ?`,
        [permission.id],
      );
    }

    // Delete package permissions
    await queryRunner.query(
      `DELETE FROM permissions WHERE slug IN ('create-package', 'read-package', 'update-package', 'delete-package')`,
    );

    console.log('Package permissions removed');
  }
}
