import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignPackagePermissionsToAdmin1765000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get admin role
    const adminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'admin' LIMIT 1`,
    );

    if (adminRole.length === 0) {
      console.log(
        'Admin role not found. Please run roles and permissions migration/seeder first.',
      );
      return;
    }

    const roleId = adminRole[0].id;

    // Package permission slugs
    const packagePermissionSlugs = [
      'create-package',
      'read-package',
      'update-package',
      'delete-package',
    ];

    // Get package permission IDs
    const placeholders = packagePermissionSlugs.map(() => '?').join(',');
    const packagePermissions = await queryRunner.query(
      `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
      packagePermissionSlugs,
    );

    if (packagePermissions.length === 0) {
      console.log(
        'Package permissions not found. Please run package permissions migration first.',
      );
      return;
    }

    // Assign permissions to admin role
    for (const permission of packagePermissions) {
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
      `Assigned ${packagePermissions.length} package permissions to admin role`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get admin role
    const adminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'admin' LIMIT 1`,
    );

    if (adminRole.length === 0) {
      console.log('Admin role not found. Nothing to rollback.');
      return;
    }

    const roleId = adminRole[0].id;

    // Package permission slugs
    const packagePermissionSlugs = [
      'create-package',
      'read-package',
      'update-package',
      'delete-package',
    ];

    // Get package permission IDs
    const placeholders = packagePermissionSlugs.map(() => '?').join(',');
    const packagePermissions = await queryRunner.query(
      `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
      packagePermissionSlugs,
    );

    if (packagePermissions.length === 0) {
      console.log('Package permissions not found. Nothing to rollback.');
      return;
    }

    // Remove package permissions from admin role
    for (const permission of packagePermissions) {
      await queryRunner.query(
        `DELETE FROM role_permissions 
         WHERE role_id = ? AND permission_id = ?`,
        [roleId, permission.id],
      );
      console.log(
        `Removed permission ID ${permission.id} from admin role`,
      );
    }

    console.log(
      `Successfully removed package permissions from admin role.`,
    );
  }
}
