import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedClinicSettings1766000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if settings record with id: 1 already exists
    const existingSettings = await queryRunner.query(
      `SELECT id FROM settings WHERE id = 1 LIMIT 1`,
    );

    if (existingSettings.length > 0) {
      console.log('Clinic settings record (id: 1) already exists. Skipping seed.');
      return;
    }

    // Insert first settings record with null data
    await queryRunner.query(
      `INSERT INTO settings (id, logo, title_ar, title_en, android_version, ios_version, color, theme, createdAt, updatedAt) 
       VALUES (1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW(), NOW())`,
    );

    console.log('Clinic settings record created successfully with null data (id: 1)');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the seeded settings record
    await queryRunner.query(`DELETE FROM settings WHERE id = 1`);
    console.log('Clinic settings record (id: 1) removed');
  }
}
