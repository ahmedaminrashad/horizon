import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddMoreFieldsToClinicDoctors1774000000002
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');

    if (!table) {
      console.log('Table "doctors" does not exist, skipping migration');
      return;
    }

    // Add specialty column
    const specialtyColumn = table.findColumnByName('specialty');
    if (!specialtyColumn) {
      await queryRunner.addColumn(
        'doctors',
        new TableColumn({
          name: 'specialty',
          type: 'varchar',
          length: '255',
          isNullable: true,
        }),
      );
      console.log('Added specialty column');
    } else {
      console.log('specialty column already exists');
    }

    // Add branch_id column (if it doesn't exist)
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

      // Add foreign key constraint if branches table exists
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
      console.log('Added branch_id column');
    } else {
      console.log('branch_id column already exists');
    }

    // Add experience_years column (if it doesn't exist)
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
      console.log('Added experience_years column');
    } else {
      console.log('experience_years column already exists');
    }

    // Add number_of_patients column (if it doesn't exist)
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
      console.log('Added number_of_patients column');
    } else {
      console.log('number_of_patients column already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctors');

    if (!table) {
      return;
    }

    // Drop foreign key first (for branch_id)
    const foreignKeys = table.foreignKeys.filter(
      (fk) => fk.columnNames.indexOf('branch_id') !== -1,
    );
    for (const fk of foreignKeys) {
      await queryRunner.dropForeignKey('doctors', fk);
    }

    // Drop columns in reverse order
    const specialtyColumn = table.findColumnByName('specialty');
    if (specialtyColumn) {
      await queryRunner.dropColumn('doctors', 'specialty');
    }

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

