import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class ChangeReservationDateTimeToDate1776000000007
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');
    
    if (!table) {
      return;
    }

    // Drop the old index if it exists
    const dateTimeIndex = table.indices.find(
      (index) => index.name === 'IDX_reservations_date_time',
    );
    if (dateTimeIndex) {
      await queryRunner.dropIndex('reservations', 'IDX_reservations_date_time');
    }

    // Change column type from datetime to date and rename
    await queryRunner.changeColumn(
      'reservations',
      'date_time',
      new TableColumn({
        name: 'date',
        type: 'date',
        isNullable: false,
      }),
    );

    // Create new index for date column
    await queryRunner.createIndex(
      'reservations',
      new TableIndex({
        name: 'IDX_reservations_date',
        columnNames: ['date'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');
    
    if (!table) {
      return;
    }

    // Drop the new index
    const dateIndex = table.indices.find(
      (index) => index.name === 'IDX_reservations_date',
    );
    if (dateIndex) {
      await queryRunner.dropIndex('reservations', 'IDX_reservations_date');
    }

    // Change column back from date to datetime and rename
    await queryRunner.changeColumn(
      'reservations',
      'date',
      new TableColumn({
        name: 'date_time',
        type: 'datetime',
        isNullable: false,
      }),
    );

    // Recreate the old index
    await queryRunner.createIndex(
      'reservations',
      new TableIndex({
        name: 'IDX_reservations_date_time',
        columnNames: ['date_time'],
      }),
    );
  }
}

