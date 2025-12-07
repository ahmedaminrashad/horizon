import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateSlotTemplateTable1764000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'slot_template',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'duration',
            type: 'time',
            isNullable: false,
            comment: 'Duration of the slot (e.g., 00:30:00 for 30 minutes)',
          },
          {
            name: 'cost',
            type: 'decimal',
            precision: 10,
            scale: 2,
            default: 0,
            isNullable: false,
            comment: 'Cost of the slot',
          },
          {
            name: 'days',
            type: 'varchar',
            length: '255',
            isNullable: false,
            comment: 'Days of the week (comma-separated: MONDAY,TUESDAY,WEDNESDAY, etc.)',
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
            name: 'IDX_slot_template_duration',
            columnNames: ['duration'],
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('slot_template');
  }
}
