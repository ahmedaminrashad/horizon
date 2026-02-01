import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateQuestionsTable1776000000012 implements MigrationInterface {
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
            name: 'question_set_id',
            type: 'int',
            isNullable: false,
          },
          {
            name: 'question_text',
            type: 'text',
            isNullable: false,
          },
          {
            name: 'question_type',
            type: 'enum',
            enum: ['text', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date'],
            default: "'text'",
            isNullable: false,
          },
          {
            name: 'options',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'is_required',
            type: 'boolean',
            default: false,
            isNullable: false,
          },
          {
            name: 'order',
            type: 'int',
            default: 0,
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

    await queryRunner.createForeignKey(
      'questions',
      new TableForeignKey({
        columnNames: ['question_set_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'question_sets',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('questions');
    if (table) {
      const foreignKey = table.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('question_set_id') !== -1,
      );
      if (foreignKey) {
        await queryRunner.dropForeignKey('questions', foreignKey);
      }
    }
    await queryRunner.dropTable('questions');
  }
}
