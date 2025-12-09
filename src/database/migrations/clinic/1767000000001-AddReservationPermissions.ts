import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReservationPermissions1767000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      {
        name: 'Create Reservation',
        slug: 'create-reservation',
        description: 'Allows creating new reservations',
      },
      {
        name: 'Read Reservation',
        slug: 'read-reservation',
        description: 'Allows reading reservation information',
      },
      {
        name: 'Update Reservation',
        slug: 'update-reservation',
        description: 'Allows updating reservation information',
      },
      {
        name: 'Delete Reservation',
        slug: 'delete-reservation',
        description: 'Allows deleting reservations',
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

    // Assign reservation permissions to clinic-admin role
    const clinicAdminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'clinic-admin' LIMIT 1`,
    );

    if (clinicAdminRole.length > 0) {
      const roleId = clinicAdminRole[0].id;

      // Get permission IDs for reservation permissions
      const reservationPermissionSlugs = permissions.map((p) => p.slug);
      const placeholders = reservationPermissionSlugs.map(() => '?').join(',');
      const permissionIds = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
        reservationPermissionSlugs,
      );

      // Assign permissions to clinic-admin role
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
        `Assigned ${permissionIds.length} reservation permissions to clinic-admin role`,
      );
    }

    console.log('Reservation permissions added successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role-permission relationships for reservation permissions
    const reservationPermissions = await queryRunner.query(
      `SELECT id FROM permissions WHERE slug IN ('create-reservation', 'read-reservation', 'update-reservation', 'delete-reservation')`,
    );

    for (const permission of reservationPermissions) {
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE permission_id = ?`,
        [permission.id],
      );
    }

    // Delete reservation permissions
    await queryRunner.query(
      `DELETE FROM permissions WHERE slug IN ('create-reservation', 'read-reservation', 'update-reservation', 'delete-reservation')`,
    );

    console.log('Reservation permissions removed');
  }
}
