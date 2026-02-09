import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreatePatientQuestionAnswersTable1776000000018
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'patient_question_answers',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'patient_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'doctor_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'clinic_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'reservation_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'is_answer_yes',
            type: 'boolean',
            isNullable: true,
          },
          {
            name: 'comment',
            type: 'text',
            isNullable: true,
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
            name: 'IDX_patient_question_answers_clinic_id',
            columnNames: ['clinic_id'],
          },
          {
            name: 'IDX_patient_question_answers_patient_id',
            columnNames: ['patient_id'],
          },
          {
            name: 'IDX_patient_question_answers_doctor_id',
            columnNames: ['doctor_id'],
          },
          {
            name: 'IDX_patient_question_answers_reservation_id',
            columnNames: ['reservation_id'],
          },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'patient_question_answers',
      new TableForeignKey({
        columnNames: ['patient_id'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'patient_question_answers',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedTableName: 'doctors',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'patient_question_answers',
      new TableForeignKey({
        columnNames: ['reservation_id'],
        referencedTableName: 'reservations',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patient_question_answers');
    if (table) {
      for (const fk of table.foreignKeys) {
        await queryRunner.dropForeignKey('patient_question_answers', fk);
      }
    }
    await queryRunner.dropTable('patient_question_answers', true);
  }
}
