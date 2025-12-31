import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddBranchIdToWorkingHours1776000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    let table = await queryRunner.getTable('working_hours');
    const hasBranchIdColumn = table?.findColumnByName('branch_id');

    // Add branch_id column to working_hours table if it doesn't exist
    if (!hasBranchIdColumn) {
      await queryRunner.addColumn(
        'working_hours',
        new TableColumn({
          name: 'branch_id',
          type: 'int',
          isNullable: true,
        }),
      );
      // Refresh table reference after adding column
      table = await queryRunner.getTable('working_hours');
    }

    // Check if foreign key already exists
    const existingForeignKeys = table?.foreignKeys.filter(
      (fk) => fk.columnNames.indexOf('branch_id') !== -1,
    );
    const hasForeignKey = existingForeignKeys && existingForeignKeys.length > 0;

    // Create foreign key to branches table if it doesn't exist
    if (!hasForeignKey) {
      await queryRunner.createForeignKey(
        'working_hours',
        new TableForeignKey({
          columnNames: ['branch_id'],
          referencedColumnNames: ['id'],
          referencedTableName: 'branches',
          onDelete: 'CASCADE',
        }),
      );
      // Refresh table reference after adding foreign key
      table = await queryRunner.getTable('working_hours');
    }

    // Check if index already exists
    const existingIndexes = table?.indices.filter(
      (idx) => idx.name === 'IDX_working_hours_branch',
    );
    const hasBranchIndex = existingIndexes && existingIndexes.length > 0;

    // Create index for branch_id if it doesn't exist
    if (!hasBranchIndex) {
      await queryRunner.createIndex(
        'working_hours',
        new TableIndex({
          name: 'IDX_working_hours_branch',
          columnNames: ['branch_id'],
        }),
      );
      // Refresh table reference after adding index
      table = await queryRunner.getTable('working_hours');
    }

    // Check if composite index already exists
    const existingCompositeIndexes = table?.indices.filter(
      (idx) => idx.name === 'IDX_working_hours_day_branch',
    );
    const hasCompositeIndex =
      existingCompositeIndexes && existingCompositeIndexes.length > 0;

    // Create a new composite index that includes branch_id for better query performance
    if (!hasCompositeIndex) {
      await queryRunner.createIndex(
        'working_hours',
        new TableIndex({
          name: 'IDX_working_hours_day_branch',
          columnNames: ['day', 'branch_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('working_hours');

    // Drop the composite index with branch_id
    const existingCompositeIndexes = table?.indices.filter(
      (idx) => idx.name === 'IDX_working_hours_day_branch',
    );
    if (existingCompositeIndexes && existingCompositeIndexes.length > 0) {
      await queryRunner.dropIndex(
        'working_hours',
        'IDX_working_hours_day_branch',
      );
    }

    // Drop branch_id index
    const existingIndexes = table?.indices.filter(
      (idx) => idx.name === 'IDX_working_hours_branch',
    );
    if (existingIndexes && existingIndexes.length > 0) {
      await queryRunner.dropIndex('working_hours', 'IDX_working_hours_branch');
    }

    // Get table to find foreign key name
    const existingForeignKeys = table?.foreignKeys.filter(
      (fk) => fk.columnNames.indexOf('branch_id') !== -1,
    );

    if (existingForeignKeys && existingForeignKeys.length > 0) {
      await queryRunner.dropForeignKey(
        'working_hours',
        existingForeignKeys[0],
      );
    }

    // Drop branch_id column
    const hasBranchIdColumn = table?.findColumnByName('branch_id');
    if (hasBranchIdColumn) {
      await queryRunner.dropColumn('working_hours', 'branch_id');
    }
  }
}

