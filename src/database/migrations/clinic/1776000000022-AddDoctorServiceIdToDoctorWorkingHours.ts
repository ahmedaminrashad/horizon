import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddDoctorServiceIdToDoctorWorkingHours1776000000022
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    const hasColumn = table?.findColumnByName('doctor_service_id');

    if (!hasColumn) {
      await queryRunner.addColumn(
        'doctor_working_hours',
        new TableColumn({
          name: 'doctor_service_id',
          type: 'int',
          isNullable: true,
          comment: 'Optional link to doctor_services (e.g. consultation, follow-up)',
        }),
      );
    }

    const updatedTable = await queryRunner.getTable('doctor_working_hours');
    const existingForeignKey = updatedTable?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('doctor_service_id') !== -1,
    );

    if (!existingForeignKey) {
      try {
        await queryRunner.createForeignKey(
          'doctor_working_hours',
          new TableForeignKey({
            columnNames: ['doctor_service_id'],
            referencedTableName: 'doctor_services',
            referencedColumnNames: ['id'],
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (
          !errorMessage.includes('Duplicate foreign key') &&
          !errorMessage.includes('already exists')
        ) {
          throw error;
        }
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_working_hours');
    if (!table) {
      return;
    }

    const hasColumn = table.findColumnByName('doctor_service_id');
    if (hasColumn) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('doctor_service_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('doctor_working_hours', foreignKey);
      }
      await queryRunner.dropColumn('doctor_working_hours', 'doctor_service_id');
    }
  }
}
