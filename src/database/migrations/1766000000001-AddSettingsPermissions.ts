import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSettingsPermissions1766000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      {
        name: 'Read Setting',
        slug: 'read-setting',
        description: 'Allows reading application settings',
      },
      {
        name: 'Update Setting',
        slug: 'update-setting',
        description: 'Allows updating application settings',
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

    // Assign all settings permissions to admin role
    const adminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'admin' LIMIT 1`,
    );

    if (adminRole.length > 0) {
      const roleId = adminRole[0].id;

      // Get permission IDs for settings permissions
      const settingsPermissionSlugs = permissions.map((p) => p.slug);
      const placeholders = settingsPermissionSlugs.map(() => '?').join(',');
      const permissionIds = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
        settingsPermissionSlugs,
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
        `Assigned ${permissionIds.length} settings permissions to admin role`,
      );
    }

    console.log('Settings permissions added successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role-permission relationships for settings permissions
    const settingsPermissions = await queryRunner.query(
      `SELECT id FROM permissions WHERE slug IN ('read-setting', 'update-setting')`,
    );

    for (const permission of settingsPermissions) {
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE permission_id = ?`,
        [permission.id],
      );
    }

    // Delete settings permissions
    await queryRunner.query(
      `DELETE FROM permissions WHERE slug IN ('read-setting', 'update-setting')`,
    );

    console.log('Settings permissions removed');
  }
}
