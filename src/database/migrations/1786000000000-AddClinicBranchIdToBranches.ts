import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

export class AddClinicBranchIdToBranches1786000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('branches');
    const hasClinicBranchIdColumn = table?.findColumnByName('clinic_branch_id');

    if (!hasClinicBranchIdColumn) {
      await queryRunner.addColumn(
        'branches',
        new TableColumn({
          name: 'clinic_branch_id',
          type: 'int',
          isNullable: true,
        }),
      );

      // Add index for better query performance
      await queryRunner.createIndex(
        'branches',
        new TableIndex({
          name: 'IDX_branches_clinic_branch_id',
          columnNames: ['clinic_branch_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('branches');
    const hasClinicBranchIdColumn = table?.findColumnByName('clinic_branch_id');

    if (hasClinicBranchIdColumn) {
      await queryRunner.dropIndex('branches', 'IDX_branches_clinic_branch_id');
      await queryRunner.dropColumn('branches', 'clinic_branch_id');
    }
  }
}

