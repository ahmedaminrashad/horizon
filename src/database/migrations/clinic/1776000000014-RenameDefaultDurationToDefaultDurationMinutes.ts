import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameDefaultDurationToDefaultDurationMinutes1776000000014
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('services');

    if (!table) {
      return;
    }

    const defaultDurationColumn = table.findColumnByName('default_duration');
    const defaultDurationMinutesColumn = table.findColumnByName(
      'default_duration_minutes',
    );

    if (defaultDurationColumn && !defaultDurationMinutesColumn) {
      await queryRunner.query(`
        ALTER TABLE services 
        CHANGE COLUMN default_duration default_duration_minutes INT NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('services');

    if (!table) {
      return;
    }

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
  }
}
