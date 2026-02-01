import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
  TableIndex,
} from 'typeorm';

export class CreateQuestionSetAssignmentsTable1776000000013
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'question_set_assignments',
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
            name: 'doctor_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'service_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'specialty',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'appoint_type',
            type: 'enum',
            enum: ['in-clinic', 'online', 'home'],
            isNullable: true,
          },
          {
            name: 'branch_id',
            type: 'int',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'int',
            default: 0,
            isNullable: false,
            comment: 'Priority: higher number = higher priority. Service(5) > Doctor(4) > Specialty(3) > VisitType(2) > Branch(1)',
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

    // Create foreign keys
    await queryRunner.createForeignKey(
      'question_set_assignments',
      new TableForeignKey({
        columnNames: ['question_set_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'question_sets',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'question_set_assignments',
      new TableForeignKey({
        columnNames: ['doctor_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'doctors',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'question_set_assignments',
      new TableForeignKey({
        columnNames: ['service_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'services',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'question_set_assignments',
      new TableForeignKey({
        columnNames: ['branch_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'branches',
        onDelete: 'CASCADE',
      }),
    );

    // Create indexes
    await queryRunner.createIndex(
      'question_set_assignments',
      new TableIndex({
        name: 'IDX_assignments_question_set_id',
        columnNames: ['question_set_id'],
      }),
    );

    await queryRunner.createIndex(
      'question_set_assignments',
      new TableIndex({
        name: 'IDX_assignments_doctor_id',
        columnNames: ['doctor_id'],
      }),
    );

    await queryRunner.createIndex(
      'question_set_assignments',
      new TableIndex({
        name: 'IDX_assignments_service_id',
        columnNames: ['service_id'],
      }),
    );

    await queryRunner.createIndex(
      'question_set_assignments',
      new TableIndex({
        name: 'IDX_assignments_specialty',
        columnNames: ['specialty'],
      }),
    );

    await queryRunner.createIndex(
      'question_set_assignments',
      new TableIndex({
        name: 'IDX_assignments_appoint_type',
        columnNames: ['appoint_type'],
      }),
    );

    await queryRunner.createIndex(
      'question_set_assignments',
      new TableIndex({
        name: 'IDX_assignments_branch_id',
        columnNames: ['branch_id'],
      }),
    );

    // Create unique index for preventing duplicate assignments
    await queryRunner.createIndex(
      'question_set_assignments',
      new TableIndex({
        name: 'IDX_unique_assignment',
        columnNames: [
          'question_set_id',
          'doctor_id',
          'service_id',
          'specialty',
          'appoint_type',
          'branch_id',
        ],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('question_set_assignments');
    if (table) {
      const foreignKeys = table.foreignKeys;
      for (const foreignKey of foreignKeys) {
        await queryRunner.dropForeignKey('question_set_assignments', foreignKey);
      }
    }
    await queryRunner.dropTable('question_set_assignments');
  }
}
