import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
} from 'typeorm';

export class AddFromTimeAndToTimeToReservations1798000000001
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');

    if (!table) {
      console.log('Table "reservations" does not exist, skipping migration');
      return;
    }

    // Add from_time column if it doesn't exist
    const hasFromTimeColumn = table.findColumnByName('from_time');
    if (!hasFromTimeColumn) {
      await queryRunner.addColumn(
        'reservations',
        new TableColumn({
          name: 'from_time',
          type: 'time',
          isNullable: true,
          comment: 'Start time from working hour (e.g., 09:00:00)',
        }),
      );
      console.log('Added from_time column to reservations table');
    } else {
      console.log('from_time column already exists in reservations table');
    }

    // Add to_time column if it doesn't exist
    const hasToTimeColumn = table.findColumnByName('to_time');
    if (!hasToTimeColumn) {
      await queryRunner.addColumn(
        'reservations',
        new TableColumn({
          name: 'to_time',
          type: 'time',
          isNullable: true,
          comment: 'End time from working hour (e.g., 17:00:00)',
        }),
      );
      console.log('Added to_time column to reservations table');
    } else {
      console.log('to_time column already exists in reservations table');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');

    if (!table) {
      return;
    }

    // Drop to_time column if it exists
    const hasToTimeColumn = table.findColumnByName('to_time');
    if (hasToTimeColumn) {
      await queryRunner.dropColumn('reservations', 'to_time');
      console.log('Dropped to_time column from reservations table');
    }

    // Drop from_time column if it exists
    const hasFromTimeColumn = table.findColumnByName('from_time');
    if (hasFromTimeColumn) {
      await queryRunner.dropColumn('reservations', 'from_time');
      console.log('Dropped from_time column from reservations table');
    }
  }
}
