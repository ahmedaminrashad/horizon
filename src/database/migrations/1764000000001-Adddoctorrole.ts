import { MigrationInterface, QueryRunner } from 'typeorm';

export class Adddoctorrole1764000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if doctor role already exists
    const existingRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'doctor' LIMIT 1`,
    );

    if (existingRole.length === 0) {
      // Insert doctor role
      await queryRunner.query(
        `INSERT INTO roles (name, slug, description, createdAt, updatedAt) 
         VALUES ('Doctor', 'doctor', 'Doctor role for healthcare professionals', NOW(), NOW())`,
      );

      // Get the doctor role ID
      const [doctorRole] = await queryRunner.query(
        `SELECT id FROM roles WHERE slug = 'doctor' LIMIT 1`,
      );

      // Get common permissions that doctors might need (if they exist)
      const permissions = await queryRunner.query(
        `SELECT id, slug FROM permissions WHERE slug IN ('read-user', 'read-patient', 'create-patient', 'update-patient')`,
      );

      // Assign permissions to doctor role if they exist
      if (doctorRole && permissions.length > 0) {
        for (const permission of permissions) {
          // Check if the relationship already exists
          const existingRelation = await queryRunner.query(
            `SELECT * FROM role_permissions 
             WHERE role_id = ? AND permission_id = ? 
             LIMIT 1`,
            [doctorRole.id, permission.id],
          );

          if (existingRelation.length === 0) {
            await queryRunner.query(
              `INSERT INTO role_permissions (role_id, permission_id) 
               VALUES (?, ?)`,
              [doctorRole.id, permission.id],
            );
          }
        }
      }

      console.log('Doctor role created successfully');
    } else {
      console.log('Doctor role already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get doctor role ID
    const [doctorRole] = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'doctor' LIMIT 1`,
    );

    if (doctorRole) {
      // Remove doctor role permissions
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE role_id = ?`,
        [doctorRole.id],
      );

      // Remove doctor role
      await queryRunner.query(`DELETE FROM roles WHERE slug = 'doctor'`);
    }
  }
}
