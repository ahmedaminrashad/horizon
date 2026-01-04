import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddDoctorWorkingHourIdToReservations1776000000003
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');
    const hasColumn = table?.findColumnByName('doctor_working_hour_id');

    // Add doctor_working_hour_id column if it doesn't exist
    if (!hasColumn) {
      await queryRunner.addColumn(
        'reservations',
        new TableColumn({
          name: 'doctor_working_hour_id',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    // Check if foreign key already exists
    const updatedTable = await queryRunner.getTable('reservations');
    const existingForeignKey = updatedTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('doctor_working_hour_id') !== -1,
    );

    // Add foreign key constraint only if it doesn't exist
    if (!existingForeignKey) {
      try {
        await queryRunner.createForeignKey(
          'reservations',
          new TableForeignKey({
            columnNames: ['doctor_working_hour_id'],
            referencedTableName: 'doctor_working_hours',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }),
        );
      } catch (error) {
        // Silently ignore if foreign key creation fails (might already exist with different name)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('Duplicate foreign key') && !errorMessage.includes('already exists')) {
          throw error;
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('reservations');
    if (!table) {
      return;
    }

    const hasColumn = table.findColumnByName('doctor_working_hour_id');

    if (hasColumn) {
      // Find and drop the foreign key first
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('doctor_working_hour_id') !== -1,
      );

      if (foreignKey) {
        await queryRunner.dropForeignKey('reservations', foreignKey);
      }

      // Drop the column
      await queryRunner.dropColumn('reservations', 'doctor_working_hour_id');
    }
  }
}

