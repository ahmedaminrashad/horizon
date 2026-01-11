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

    // Check if the column exists before trying to change it
    const dateTimeColumn = table.findColumnByName('date_time');
    if (!dateTimeColumn) {
      // Column might already be renamed to 'date'
      const dateColumn = table.findColumnByName('date');
      if (dateColumn && dateColumn.type === 'date') {
        // Column already changed, just ensure index exists
        const dateIndex = table.indices.find(
          (index) => index.name === 'IDX_reservations_date',
        );
        if (!dateIndex) {
          await queryRunner.createIndex(
            'reservations',
            new TableIndex({
              name: 'IDX_reservations_date',
              columnNames: ['date'],
            }),
          );
        }
        return;
      }
      return;
    }

    // Change column type from datetime to date and rename
    // Using raw SQL to avoid foreign key issues that TypeORM might have
    try {
      await queryRunner.query(
        `ALTER TABLE \`reservations\` CHANGE \`date_time\` \`date\` DATE NOT NULL`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // If error is about foreign key that doesn't exist, try to continue
      if (
        errorMessage.includes("Can't DROP FOREIGN KEY") ||
        errorMessage.includes('check that it exists')
      ) {
        // Try with a different approach - check if column already changed
        const updatedTable = await queryRunner.getTable('reservations');
        const dateColumn = updatedTable?.findColumnByName('date');
        if (dateColumn && dateColumn.type === 'date') {
          // Column already changed, continue
          // Column already changed, no need to log
        } else {
          // Column not changed, rethrow error
          throw error;
        }
      } else {
        // Re-throw other errors
        throw error;
      }
    }

    // Create new index for date column (if it doesn't exist)
    const updatedTable = await queryRunner.getTable('reservations');
    const dateIndex = updatedTable?.indices.find(
      (index) => index.name === 'IDX_reservations_date',
    );
    if (!dateIndex) {
      await queryRunner.createIndex(
        'reservations',
        new TableIndex({
          name: 'IDX_reservations_date',
          columnNames: ['date'],
        }),
      );
    }
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
