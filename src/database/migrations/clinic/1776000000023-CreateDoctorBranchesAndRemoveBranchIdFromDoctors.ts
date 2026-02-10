import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateDoctorBranchesAndRemoveBranchIdFromDoctors1776000000023
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create doctor_branches table
    await queryRunner.createTable(
      new Table({
        name: 'doctor_branches',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'doctor_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'branch_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'doctor_branches',
      new TableIndex({
        name: 'IDX_doctor_branches_doctor_branch_unique',
        columnNames: ['doctor_id', 'branch_id'],
        isUnique: true,
      }),
    );

    await queryRunner.createForeignKey(
      'doctor_branches',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'doctor_branches',
      new TableForeignKey({
        columnNames: ['branch_id'],
        referencedTableName: 'branches',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Migrate existing doctors.branch_id to doctor_branches
    const doctorsTable = await queryRunner.getTable('doctors');
    const hasBranchId = doctorsTable?.findColumnByName('branch_id');
    if (hasBranchId) {
      await queryRunner.query(`
        INSERT INTO doctor_branches (doctor_id, branch_id)
        SELECT id, branch_id FROM doctors WHERE branch_id IS NOT NULL
      `);
    }

    // Drop foreign key and column branch_id from doctors
    const table = await queryRunner.getTable('doctors');
    if (table) {
      const fk = table.foreignKeys.find(
        (k) => k.columnNames.indexOf('branch_id') !== -1,
      );
      if (fk) {
        await queryRunner.dropForeignKey('doctors', fk);
      }
      const col = table.findColumnByName('branch_id');
      if (col) {
        await queryRunner.dropColumn('doctors', 'branch_id');
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add branch_id to doctors (nullable)
    await queryRunner.query(`
      ALTER TABLE doctors ADD COLUMN branch_id INT NULL
    `);
    await queryRunner.createForeignKey(
      'doctors',
      new TableForeignKey({
        columnNames: ['branch_id'],
        referencedTableName: 'branches',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
    // Optionally copy first doctor_branch back (single branch per doctor)
    await queryRunner.query(`
      UPDATE doctors d
      INNER JOIN (
        SELECT doctor_id, MIN(branch_id) AS branch_id
        FROM doctor_branches GROUP BY doctor_id
      ) db ON d.id = db.doctor_id
      SET d.branch_id = db.branch_id
    `);

    // Drop doctor_branches
    const table = await queryRunner.getTable('doctor_branches');
    if (table) {
      for (const fk of table.foreignKeys) {
        await queryRunner.dropForeignKey('doctor_branches', fk);
      }
    }
    await queryRunner.dropTable('doctor_branches', true);
  }
}
