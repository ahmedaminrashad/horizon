import { MigrationInterface, QueryRunner } from 'typeorm';

export class Addpatientrole1763373899350 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if patient role already exists
    const existingRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'patient' LIMIT 1`,
    );

    if (existingRole.length === 0) {
      // Insert patient role
      await queryRunner.query(
        `INSERT INTO roles (name, slug, description, createdAt, updatedAt) 
         VALUES ('Patient', 'patient', 'Patient role for healthcare patients', NOW(), NOW())`,
      );

      // Get the patient role ID
      const [patientRole] = await queryRunner.query(
        `SELECT id FROM roles WHERE slug = 'patient' LIMIT 1`,
      );

      // Get read-user permission ID (if exists)
      const [readUserPermission] = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug = 'read-user' LIMIT 1`,
      );

      // Assign read-user permission to patient role if it exists
      if (readUserPermission && patientRole) {
        // Check if the relationship already exists
        const existingRelation = await queryRunner.query(
          `SELECT * FROM role_permissions 
           WHERE role_id = ? AND permission_id = ? 
           LIMIT 1`,
          [patientRole.id, readUserPermission.id],
        );

        if (existingRelation.length === 0) {
          await queryRunner.query(
            `INSERT INTO role_permissions (role_id, permission_id) 
             VALUES (?, ?)`,
            [patientRole.id, readUserPermission.id],
          );
        }
      }

      console.log('Patient role created successfully');
    } else {
      console.log('Patient role already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Get patient role ID
    const [patientRole] = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'patient' LIMIT 1`,
    );

    if (patientRole) {
      // Remove patient role permissions
      await queryRunner.query(
        `DELETE FROM role_permissions WHERE role_id = ?`,
        [patientRole.id],
      );

      // Remove patient role
      await queryRunner.query(`DELETE FROM roles WHERE slug = 'patient'`);
    }
  }
}
