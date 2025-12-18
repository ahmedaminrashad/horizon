import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddFieldsToMainDoctors1790000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');

    if (!table) {
      console.log('Table "doctors" does not exist, skipping migration');
      return;
    }

    // Add branch_id column
    const branchIdColumn = table.findColumnByName('branch_id');
    if (!branchIdColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'branch_id',
          type: 'int',
          isNullable: true,
        }),
      );

      // Add foreign key constraint
      const branchesTable = await queryRunner.getTable('branches');
      if (branchesTable) {
        await queryRunner.createForeignKey(
          'doctors',
          new TableForeignKey({
            columnNames: ['branch_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'branches',
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE',
          }),
        );
      }
    }

    // Add experience_years column
    const experienceYearsColumn = table.findColumnByName('experience_years');
    if (!experienceYearsColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'experience_years',
          type: 'int',
          isNullable: true,
        }),
      );
    }

    // Add number_of_patients column
    const numberOfPatientsColumn = table.findColumnByName('number_of_patients');
    if (!numberOfPatientsColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'number_of_patients',
          type: 'int',
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');

    if (!table) {
      return;
    }

    // Drop foreign key first
    const foreignKeys = table.foreignKeys.filter(
      (fk) => fk.columnNames.indexOf('branch_id') !== -1,
    );
    for (const fk of foreignKeys) {
      await queryRunner.dropForeignKey('doctors', fk);
    }

    // Drop columns
    const numberOfPatientsColumn = table.findColumnByName('number_of_patients');
    if (numberOfPatientsColumn) {
      await queryRunner.dropColumn('doctors', 'number_of_patients');
    }

    const experienceYearsColumn = table.findColumnByName('experience_years');
    if (experienceYearsColumn) {
      await queryRunner.dropColumn('doctors', 'experience_years');
    }

    const branchIdColumn = table.findColumnByName('branch_id');
    if (branchIdColumn) {
      await queryRunner.dropColumn('doctors', 'branch_id');
    }
  }
}

