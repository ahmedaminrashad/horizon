import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class Createadminuser1763459449139 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if admin role exists
    const [adminRole] = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'admin' LIMIT 1`,
    );

    if (!adminRole) {
      console.log(
        'Admin role not found. Please run roles and permissions migration/seeder first.',
      );
      return;
    }

    // Check if admin user already exists
    const [existingAdminByPhone] = await queryRunner.query(
      `SELECT id FROM users WHERE phone = '01017213866' LIMIT 1`,
    );

    const [existingAdminByEmail] = await queryRunner.query(
      `SELECT id FROM users WHERE email = 'amin@horizon.com' LIMIT 1`,
    );

    if (existingAdminByPhone || existingAdminByEmail) {
      const adminUserId = existingAdminByPhone?.id || existingAdminByEmail?.id;

      // Update existing admin to have admin role if not already assigned
      const [currentUser] = await queryRunner.query(
        `SELECT role_id FROM users WHERE id = ? LIMIT 1`,
        [adminUserId],
      );

      if (currentUser && currentUser.role_id !== adminRole.id) {
        await queryRunner.query(
          `UPDATE users SET role_id = ? WHERE id = ?`,
          [adminRole.id, adminUserId],
        );
        console.log('Admin user role updated successfully!');
      } else {
        console.log('Admin user already exists with admin role. Skipping migration.');
      }
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('123456789', 10);

    // Create admin user
    await queryRunner.query(
      `INSERT INTO users (phone, email, password, package_id, role_id, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
      ['01017213866', 'amin@horizon.com', hashedPassword, 0, adminRole.id],
    );

    console.log('Admin user created successfully!');
    console.log('Email: amin@horizon.com');
    console.log('Phone: 01017213866');
    console.log('Password: 123456789');
    console.log(`Role: Admin (admin) - All permissions assigned`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove admin user
    const [adminUser] = await queryRunner.query(
      `SELECT id FROM users WHERE phone = '01017213866' OR email = 'amin@horizon.com' LIMIT 1`,
    );

    if (adminUser) {
      await queryRunner.query(`DELETE FROM users WHERE id = ?`, [adminUser.id]);
      console.log('Admin user removed successfully!');
    }
  }
}
