import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWorkingHoursTable1775000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'working_hours',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'day',
            type: 'enum',
            enum: [
              'MONDAY',
              'TUESDAY',
              'WEDNESDAY',
              'THURSDAY',
              'FRIDAY',
              'SATURDAY',
              'SUNDAY',
            ],
            isNullable: false,
          },
          {
            name: 'start_time',
            type: 'time',
            isNullable: false,
            comment: 'Start time of working hours (e.g., 09:00:00)',
          },
          {
            name: 'end_time',
            type: 'time',
            isNullable: false,
            comment: 'End time of working hours (e.g., 17:00:00)',
          },
          {
            name: 'range_order',
            type: 'int',
            default: 0,
            isNullable: false,
            comment: 'Order/sequence for multiple ranges on the same day',
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: 'Whether this working hour range is active',
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

    // Create index on day for faster queries
    await queryRunner.createIndex(
      'working_hours',
      new TableIndex({
        name: 'IDX_working_hours_day',
        columnNames: ['day'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('working_hours');
  }
}
