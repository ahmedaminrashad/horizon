import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class AddQuestionIdToPatientQuestionAnswers1776000000019
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patient_question_answers');
    if (table && !table.findColumnByName('question_id')) {
      await queryRunner.addColumn(
        'patient_question_answers',
        new TableColumn({
          name: 'question_id',
          type: 'int',
          isNullable: true,
        }),
      );
      await queryRunner.createIndex(
        'patient_question_answers',
        new TableIndex({
          name: 'IDX_patient_question_answers_question_id',
          columnNames: ['question_id'],
        }),
      );
      await queryRunner.createForeignKey(
        'patient_question_answers',
        new TableForeignKey({
          columnNames: ['question_id'],
          referencedTableName: 'questions',
          referencedColumnNames: ['id'],
          onDelete: 'CASCADE',
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('patient_question_answers');
    if (table) {
      const fk = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('question_id') !== -1,
      );
      if (fk) {
        await queryRunner.dropForeignKey('patient_question_answers', fk);
      }
      const index = table.indices.find(
        (idx) => idx.name === 'IDX_patient_question_answers_question_id',
      );
      if (index) {
        await queryRunner.dropIndex('patient_question_answers', index);
      }
      const column = table.findColumnByName('question_id');
      if (column) {
        await queryRunner.dropColumn('patient_question_answers', 'question_id');
      }
    }
  }
}
