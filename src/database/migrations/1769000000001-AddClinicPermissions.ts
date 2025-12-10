import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClinicPermissions1769000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert clinic permissions
    await queryRunner.query(`
      INSERT INTO permissions (name, slug, description, createdAt, updatedAt)
      VALUES
        ('Create Clinic', 'create-clinic', 'Allows creating new clinics', NOW(), NOW()),
        ('Read Clinic', 'read-clinic', 'Allows reading clinic information', NOW(), NOW()),
        ('Update Clinic', 'update-clinic', 'Allows updating clinic information', NOW(), NOW()),
        ('Delete Clinic', 'delete-clinic', 'Allows deleting clinics', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        description = VALUES(description),
        updatedAt = NOW()
    `);

    // Get admin role ID
    const [adminRole] = await queryRunner.query(`
      SELECT id FROM roles WHERE slug = 'admin' LIMIT 1
    `);

    if (adminRole && adminRole.id) {
      // Get clinic permission IDs
      const clinicPermissions = await queryRunner.query(`
        SELECT id FROM permissions WHERE slug IN ('create-clinic', 'read-clinic', 'update-clinic', 'delete-clinic')
      `);

      // Assign clinic permissions to admin role
      for (const permission of clinicPermissions) {
        await queryRunner.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE role_id = role_id
        `, [adminRole.id, permission.id]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove clinic permissions from admin role
    await queryRunner.query(`
      DELETE rp FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      INNER JOIN roles r ON rp.role_id = r.id
      WHERE r.slug = 'admin' AND p.slug IN ('create-clinic', 'read-clinic', 'update-clinic', 'delete-clinic')
    `);

    // Delete clinic permissions
    await queryRunner.query(`
      DELETE FROM permissions WHERE slug IN ('create-clinic', 'read-clinic', 'update-clinic', 'delete-clinic')
    `);
  }
}
