import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBranchPermissions1787000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Insert branch permissions
    await queryRunner.query(`
      INSERT INTO permissions (name, slug, description, createdAt, updatedAt)
      VALUES
        ('Create Branch', 'create-branch', 'Allows creating new branches', NOW(), NOW()),
        ('Read Branch', 'read-branch', 'Allows reading branch information', NOW(), NOW()),
        ('Update Branch', 'update-branch', 'Allows updating branch information', NOW(), NOW()),
        ('Delete Branch', 'delete-branch', 'Allows deleting branches', NOW(), NOW())
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
      // Get branch permission IDs
      const branchPermissions = await queryRunner.query(`
        SELECT id FROM permissions WHERE slug IN ('create-branch', 'read-branch', 'update-branch', 'delete-branch')
      `);

      // Assign branch permissions to admin role
      for (const permission of branchPermissions) {
        await queryRunner.query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE role_id = role_id
        `, [adminRole.id, permission.id]);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove branch permissions from admin role
    await queryRunner.query(`
      DELETE rp FROM role_permissions rp
      INNER JOIN permissions p ON rp.permission_id = p.id
      INNER JOIN roles r ON rp.role_id = r.id
      WHERE r.slug = 'admin' AND p.slug IN ('create-branch', 'read-branch', 'update-branch', 'delete-branch')
    `);

    // Delete branch permissions
    await queryRunner.query(`
      DELETE FROM permissions WHERE slug IN ('create-branch', 'read-branch', 'update-branch', 'delete-branch')
    `);
  }
}


