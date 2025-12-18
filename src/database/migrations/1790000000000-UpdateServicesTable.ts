import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class UpdateServicesTable1790000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('services');

    if (!table) {
      console.log('Table "services" does not exist, skipping migration');
      return;
    }

    // Check if clinic_service_id column exists and drop it
    const clinicServiceIdColumn = table.findColumnByName('clinic_service_id');
    if (clinicServiceIdColumn) {
      // Drop the index first if it exists
      const index = table.indices.find(
        (idx) => idx.name === 'IDX_services_clinic_service_id',
      );
      if (index) {
        await queryRunner.dropIndex(
          'services',
          'IDX_services_clinic_service_id',
        );
      }
      // Drop the column
      await queryRunner.dropColumn('services', 'clinic_service_id');
    }

    // Rename default_duration to default_duration_minutes if it exists
    const defaultDurationColumn = table.findColumnByName('default_duration');
    const defaultDurationMinutesColumn = table.findColumnByName(
      'default_duration_minutes',
    );

    if (defaultDurationColumn && !defaultDurationMinutesColumn) {
      // Use ALTER TABLE CHANGE to rename the column explicitly
      await queryRunner.query(`
        ALTER TABLE services 
        CHANGE COLUMN default_duration default_duration_minutes INT NULL
      `);
    } else if (!defaultDurationColumn && !defaultDurationMinutesColumn) {
      // If column doesn't exist, add it as default_duration_minutes
      await queryRunner.addColumn(
        'services',
        new TableColumn({
          name: 'default_duration_minutes',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    // Update enum values for type column
    // First, we need to update existing data
    await queryRunner.query(`
      UPDATE services 
      SET type = 'follow_up' 
      WHERE type = 'follow-up'
    `);

    await queryRunner.query(`
      UPDATE services 
      SET type = 'online_consultation' 
      WHERE type = 'online consultation'
    `);

    await queryRunner.query(`
      UPDATE services 
      SET type = 'home_visit' 
      WHERE type = 'home visit'
    `);

    // Now modify the enum column to include new values
    await queryRunner.query(`
      ALTER TABLE services 
      MODIFY COLUMN type ENUM(
        'consultation',
        'follow_up',
        'online_consultation',
        'home_visit',
        'other'
      ) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('services');

    if (!table) {
      return;
    }

    // Revert enum values
    await queryRunner.query(`
      UPDATE services 
      SET type = 'follow-up' 
      WHERE type = 'follow_up'
    `);

    await queryRunner.query(`
      UPDATE services 
      SET type = 'online consultation' 
      WHERE type = 'online_consultation'
    `);

    await queryRunner.query(`
      UPDATE services 
      SET type = 'home visit' 
      WHERE type = 'home_visit'
    `);

    await queryRunner.query(`
      ALTER TABLE services 
      MODIFY COLUMN type ENUM(
        'consultation',
        'follow-up',
        'online consultation',
        'home visit'
      ) NULL
    `);

    // Rename default_duration_minutes back to default_duration
    const defaultDurationMinutesColumn = table.findColumnByName(
      'default_duration_minutes',
    );
    const defaultDurationColumn = table.findColumnByName('default_duration');
    if (defaultDurationMinutesColumn && !defaultDurationColumn) {
      await queryRunner.query(`
        ALTER TABLE services 
        CHANGE COLUMN default_duration_minutes default_duration INT NULL
      `);
    }

    // Add back clinic_service_id column
    const clinicServiceIdColumn = table.findColumnByName('clinic_service_id');
    if (!clinicServiceIdColumn) {
      await queryRunner.addColumn(
        'services',
        new TableColumn({
          name: 'clinic_service_id',
          type: 'int',
          isNullable: false,
        }),
      );

      // Add index back
      await queryRunner.createIndex(
        'services',
        new TableIndex({
          name: 'IDX_services_clinic_service_id',
          columnNames: ['clinic_service_id'],
        }),
      );
    }
  }
}
