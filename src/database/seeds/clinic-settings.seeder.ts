import { DataSource } from 'typeorm';
import { Setting } from '../../clinic/settings/entities/setting.entity';

/**
 * Seed clinic settings for a specific clinic database
 * This should be run after clinic migrations are executed
 * Usage: Create a DataSource for the clinic database and call this function
 */
export async function seedClinicSettings(dataSource: DataSource): Promise<void> {
  const settingsRepository = dataSource.getRepository(Setting);

  // Check if settings already exist (id: 1)
  const existingSettings = await settingsRepository.findOne({
    where: { id: 1 },
  });

  if (existingSettings) {
    console.log('Clinic settings record already exists. Skipping seed.');
    return;
  }

  // Use query runner to insert with specific ID
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.query(
    `INSERT INTO settings (id, logo, title_ar, title_en, android_version, ios_version, color, theme, createdAt, updatedAt) 
     VALUES (1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW(), NOW())`,
  );
  await queryRunner.release();

  console.log('Clinic settings record created successfully with null data (id: 1)');
}
