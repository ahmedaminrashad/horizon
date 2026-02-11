import {
  MigrationInterface,
  QueryRunner,
  TableForeignKey,
  TableColumn,
} from 'typeorm';

export class RemoveReservationIdFromPatientQuestionAnswers1776000000029
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patient_question_answers');
    if (!table) return;

    const fk = table.foreignKeys.find(
      (k) => k.columnNames.indexOf('reservation_id') !== -1,
    );
    if (fk) {
      await queryRunner.dropForeignKey('patient_question_answers', fk);
    }

    await queryRunner.dropIndex(
      'patient_question_answers',
      'IDX_patient_question_answers_reservation_id',
    ).catch(() => {});

    await queryRunner.dropColumn('patient_question_answers', 'reservation_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'patient_question_answers',
      new TableColumn({
        name: 'reservation_id',
        type: 'int',
        isNullable: true,
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
}
