import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddBranchIdToClinicWorkingHours1794000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add branch_id column to clinic_working_hours table
    await queryRunner.addColumn(
      'clinic_working_hours',
      new TableColumn({
        name: 'branch_id',
        type: 'int',
        isNullable: true,
      }),
    );

    // Create foreign key to branches table
    await queryRunner.createForeignKey(
      'clinic_working_hours',
      new TableForeignKey({
        columnNames: ['branch_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'branches',
        onDelete: 'CASCADE',
      }),
    );

    // Create index for branch_id
    await queryRunner.createIndex(
      'clinic_working_hours',
      new TableIndex({
        name: 'IDX_clinic_working_hours_branch',
        columnNames: ['branch_id'],
      }),
    );

    // Create a new composite index that includes branch_id for better query performance
    // Keep the existing IDX_clinic_working_hours_clinic_day index as it may be used by foreign key constraints
    await queryRunner.createIndex(
      'clinic_working_hours',
      new TableIndex({
        name: 'IDX_clinic_working_hours_clinic_day_branch',
        columnNames: ['clinic_id', 'day', 'branch_id'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the composite index with branch_id
    await queryRunner.dropIndex(
      'clinic_working_hours',
      'IDX_clinic_working_hours_clinic_day_branch',
    );

    // Drop branch_id index
    await queryRunner.dropIndex(
      'clinic_working_hours',
      'IDX_clinic_working_hours_branch',
    );

    // Get table to find foreign key name
    const table = await queryRunner.getTable('clinic_working_hours');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('branch_id') !== -1,
    );

    if (foreignKey) {
      await queryRunner.dropForeignKey('clinic_working_hours', foreignKey);
    }

    // Drop branch_id column
    await queryRunner.dropColumn('clinic_working_hours', 'branch_id');
  }
}

