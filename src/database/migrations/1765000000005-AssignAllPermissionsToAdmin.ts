import { MigrationInterface, QueryRunner } from 'typeorm';

export class AssignAllPermissionsToAdmin1765000000005
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Get admin role
    

    const roleId = 1; // Admin role ID

    // Get all permissions from the database
    const allPermissions = await queryRunner.query(
      `SELECT id FROM permissions`,
    );

    if (allPermissions.length === 0) {
      console.log('No permissions found in the database.');
      return;
    }

    // Get permissions already assigned to admin role
    const assignedPermissions = await queryRunner.query(
      `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
      [roleId],
    );

    const assignedPermissionIds = assignedPermissions.map(
      (p: { permission_id: number }) => p.permission_id,
    );

    // Assign all permissions to admin role (skip if already assigned)
    let assignedCount = 0;
    let skippedCount = 0;

    for (const permission of allPermissions) {
      // Check if the relationship already exists
      if (assignedPermissionIds.includes(permission.id)) {
        skippedCount++;
        continue;
      }

      // Double-check that the relationship doesn't exist (safety check)
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
        assignedCount++;
      } else {
        skippedCount++;
      }
    }

    if (assignedCount > 0) {
      console.log(
        `Successfully assigned ${assignedCount} permission(s) to admin role.`,
      );
    }

    if (skippedCount > 0) {
      console.log(
        `Skipped ${skippedCount} permission(s) (already assigned to admin role).`,
      );
    }

    if (assignedCount === 0 && skippedCount === allPermissions.length) {
      console.log('All permissions are already assigned to admin role.');
    }
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

    // Get all permissions currently assigned to admin role
    const assignedPermissions = await queryRunner.query(
      `SELECT permission_id FROM role_permissions WHERE role_id = ?`,
      [roleId],
    );

    if (assignedPermissions.length === 0) {
      console.log('No permissions assigned to admin role. Nothing to rollback.');
      return;
    }

    // Remove all permissions from admin role
    for (const assignedPermission of assignedPermissions) {
      await queryRunner.query(
        `DELETE FROM role_permissions 
         WHERE role_id = ? AND permission_id = ?`,
        [roleId, assignedPermission.permission_id],
      );
    }

    console.log(
      `Removed ${assignedPermissions.length} permission(s) from admin role.`,
    );
    console.log(
      'Warning: All permissions were removed from admin role. You may need to manually reassign permissions.',
    );
  }
}
