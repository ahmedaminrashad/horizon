import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropQuestionSetsTables1776000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const tables = ['question_set_assignments', 'questions', 'question_sets'];
    for (const tableName of tables) {
      const table = await queryRunner.getTable(tableName);
      if (table) {
        await queryRunner.dropTable(tableName, true);
      }
    }
  }

  public async down(): Promise<void> {
    // Tables are not recreated in down; run CreateQuestionSetsTable, CreateQuestionsTable, CreateQuestionSetAssignmentsTable if needed.
  }
}
