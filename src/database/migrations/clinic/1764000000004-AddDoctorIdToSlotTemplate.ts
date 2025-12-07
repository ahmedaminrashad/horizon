import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddDoctorIdToSlotTemplate1764000000004
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if slot_template table exists
    const tableExists = await queryRunner.hasTable('slot_template');
    
    if (!tableExists) {
      console.log('slot_template table does not exist. Skipping migration.');
      return;
    }

    // Check if column already exists
    const table = await queryRunner.getTable('slot_template');
    const doctorIdColumnExists = table?.findColumnByName('doctor_id');

    if (doctorIdColumnExists) {
      console.log('doctor_id column already exists. Skipping migration.');
      return;
    }

    // Add doctor_id column (non-nullable as it's a required field)
    await queryRunner.addColumn(
      'slot_template',
      new TableColumn({
        name: 'doctor_id',
        type: 'int',
        isNullable: false,
      }),
    );

    // Add foreign key constraint
    await queryRunner.createForeignKey(
      'slot_template',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    // Add index for better query performance
    await queryRunner.query(
      `CREATE INDEX IDX_slot_template_doctor_id ON slot_template (doctor_id)`,
    );

    console.log('Added doctor_id column to slot_template table');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key
    const table = await queryRunner.getTable('slot_template');
    const foreignKey = table?.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('doctor_id') !== -1,
    );
    if (foreignKey) {
      await queryRunner.dropForeignKey('slot_template', foreignKey);
    }

    // Drop index
    await queryRunner.query(
      `DROP INDEX IDX_slot_template_doctor_id ON slot_template`,
    );

    // Drop column
    await queryRunner.dropColumn('slot_template', 'doctor_id');
  }
}
