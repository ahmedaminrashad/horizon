import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateClinicQuestionsTable1776000000016
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'questions',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'clinic_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'doctor_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'content_en',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'content_ar',
            type: 'text',
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
        indices: [
          {
            name: 'IDX_questions_clinic_id',
            columnNames: ['clinic_id'],
          },
          {
            name: 'IDX_questions_doctor_id',
            columnNames: ['doctor_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('questions');
    if (table) {
      const fk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('doctor_id') !== -1,
      );
      if (fk) {
        await queryRunner.dropForeignKey('questions', fk);
      }
    }
    await queryRunner.dropTable('questions', true);
  }
}
