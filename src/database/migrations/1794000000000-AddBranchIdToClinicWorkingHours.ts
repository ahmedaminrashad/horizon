import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddBranchIdToClinicWorkingHours1794000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('clinic_working_hours');
    const hasBranchIdColumn = table?.findColumnByName('branch_id');

    // Add branch_id column to clinic_working_hours table if it doesn't exist
    if (!hasBranchIdColumn) {
      await queryRunner.addColumn(
        'clinic_working_hours',
        new TableColumn({
          name: 'branch_id',
          type: 'int',
          isNullable: true,
        }),
      );
      // Refresh table reference after adding column
      table = await queryRunner.getTable('clinic_working_hours');
    }

    // Check if foreign key already exists
    const existingForeignKeys = table?.foreignKeys.filter(
      (fk) => fk.columnNames.indexOf('branch_id') !== -1,
    );
    const hasForeignKey = existingForeignKeys && existingForeignKeys.length > 0;

    // Create foreign key to branches table if it doesn't exist
    if (!hasForeignKey) {
      await queryRunner.createForeignKey(
        'clinic_working_hours',
        new TableForeignKey({
          columnNames: ['branch_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'branches',
          onDelete: 'CASCADE',
        }),
      );
      // Refresh table reference after adding foreign key
      table = await queryRunner.getTable('clinic_working_hours');
    }

    // Check if index already exists
    const existingIndexes = table?.indices.filter(
      (idx) => idx.name === 'IDX_clinic_working_hours_branch',
    );
    const hasBranchIndex = existingIndexes && existingIndexes.length > 0;

    // Create index for branch_id if it doesn't exist
    if (!hasBranchIndex) {
      await queryRunner.createIndex(
        'clinic_working_hours',
        new TableIndex({
          name: 'IDX_clinic_working_hours_branch',
          columnNames: ['branch_id'],
        }),
      );
      // Refresh table reference after adding index
      table = await queryRunner.getTable('clinic_working_hours');
    }

    // Check if composite index already exists
    const existingCompositeIndexes = table?.indices.filter(
      (idx) => idx.name === 'IDX_clinic_working_hours_clinic_day_branch',
    );
    const hasCompositeIndex =
      existingCompositeIndexes && existingCompositeIndexes.length > 0;

    // Create a new composite index that includes branch_id for better query performance
    // Keep the existing IDX_clinic_working_hours_clinic_day index as it may be used by foreign key constraints
    if (!hasCompositeIndex) {
      await queryRunner.createIndex(
        'clinic_working_hours',
        new TableIndex({
          name: 'IDX_clinic_working_hours_clinic_day_branch',
          columnNames: ['clinic_id', 'day', 'branch_id'],
        }),
      );
    }
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
