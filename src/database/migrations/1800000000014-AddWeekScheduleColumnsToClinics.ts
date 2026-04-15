import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

const DAY_ENUM = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

export class AddWeekScheduleColumnsToClinics1800000000014
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    if (!table) {
      console.log('Table "clinics" does not exist, skipping migration');
      return;
    }

    if (!table.findColumnByName('week_start_day')) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'week_start_day',
          type: 'enum',
          enum: [...DAY_ENUM],
          isNullable: true,
          comment: 'Default week range start (e.g. public schedule)',
        }),
      );
    }

    if (!table.findColumnByName('week_end_day')) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'week_end_day',
          type: 'enum',
          enum: [...DAY_ENUM],
          isNullable: true,
          comment: 'Default week range end',
        }),
      );
    }

    if (!table.findColumnByName('from_time')) {
      await queryRunner.query(`
        ALTER TABLE \`clinics\`
        ADD COLUMN \`from_time\` time NULL COMMENT 'Default daily window start'
      `);
    }

    if (!table.findColumnByName('to_time')) {
      await queryRunner.query(`
        ALTER TABLE \`clinics\`
        ADD COLUMN \`to_time\` time NULL COMMENT 'Default daily window end'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['to_time', 'from_time', 'week_end_day', 'week_start_day']) {
      const t = await queryRunner.getTable('clinics');
      if (t?.findColumnByName(col)) {
        await queryRunner.dropColumn('clinics', col);
      }
    }
  }
}
