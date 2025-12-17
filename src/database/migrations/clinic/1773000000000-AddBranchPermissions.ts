import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchPermissions1773000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create branch permissions
    const permissions = [
      {
        name: 'Create Branch',
        slug: 'create-branch',
        description: 'Allows creating new branches',
      },
      {
        name: 'Read Branch',
        slug: 'read-branch',
        description: 'Allows reading branch information',
      },
      {
        name: 'Update Branch',
        slug: 'update-branch',
        description: 'Allows updating branch information',
      },
      {
        name: 'Delete Branch',
        slug: 'delete-branch',
        description: 'Allows deleting branches',
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

    // Assign branch permissions to clinic-admin role
    const clinicAdminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'clinic-admin' LIMIT 1`,
    );

    if (clinicAdminRole.length > 0) {
      const roleId = clinicAdminRole[0].id;

      for (const permissionId of createdPermissionIds) {
        // Check if the relationship already exists
        const existingRelation = await queryRunner.query(
          `SELECT * FROM role_permissions 
           WHERE role_id = ? AND permission_id = ? 
           LIMIT 1`,
          [roleId, permissionId],
        );

        if (existingRelation.length === 0) {
          await queryRunner.query(
            `INSERT INTO role_permissions (role_id, permission_id) 
             VALUES (?, ?)`,
            [roleId, permissionId],
          );
        }
      }

      console.log(
        `Assigned ${createdPermissionIds.length} branch permissions to clinic-admin role`,
      );
    }

    console.log('Branch permissions seeded successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove branch permissions from clinic-admin role
    const clinicAdminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'clinic-admin' LIMIT 1`,
    );

    if (clinicAdminRole.length > 0) {
      const roleId = clinicAdminRole[0].id;
      const branchPermissionSlugs = [
        'create-branch',
        'read-branch',
        'update-branch',
        'delete-branch',
      ];

      const placeholders = branchPermissionSlugs.map(() => '?').join(',');
      const branchPermissions = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
        branchPermissionSlugs,
      );

      for (const permission of branchPermissions) {
        await queryRunner.query(
          `DELETE FROM role_permissions 
           WHERE role_id = ? AND permission_id = ?`,
          [roleId, permission.id],
        );
      }
    }

    // Delete branch permissions
    await queryRunner.query(
      `DELETE FROM permissions WHERE slug IN ('create-branch', 'read-branch', 'update-branch', 'delete-branch')`,
    );

    console.log('Branch permissions removed');
  }
}
