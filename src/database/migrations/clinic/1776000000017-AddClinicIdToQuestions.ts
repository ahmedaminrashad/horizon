import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableIndex,
} from 'typeorm';

export class AddClinicIdToQuestions1776000000017 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('questions');
    if (table && !table.findColumnByName('clinic_id')) {
      await queryRunner.addColumn(
        'questions',
        new TableColumn({
          name: 'clinic_id',
          type: 'int',
          isNullable: false,
          default: 1,
        }),
      );
      await queryRunner.createIndex(
        'questions',
        new TableIndex({
          name: 'IDX_questions_clinic_id',
          columnNames: ['clinic_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('questions');
    if (table) {
      const index = table.indices.find(
        (idx) => idx.name === 'IDX_questions_clinic_id',
      );
      if (index) {
        await queryRunner.dropIndex('questions', index);
      }
      const column = table.findColumnByName('clinic_id');
      if (column) {
        await queryRunner.dropColumn('questions', 'clinic_id');
      }
    }
  }
}
