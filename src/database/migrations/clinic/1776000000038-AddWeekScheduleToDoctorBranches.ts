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

export class AddWeekScheduleToDoctorBranches1776000000038
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('doctor_branches');
    if (!table) {
      console.log('Table "doctor_branches" does not exist, skipping migration');
      return;
    }

    if (!table.findColumnByName('week_start_day')) {
      await queryRunner.addColumn(
        'doctor_branches',
        new TableColumn({
          name: 'week_start_day',
          type: 'enum',
          enum: [...DAY_ENUM],
          isNullable: true,
          comment: 'Optional week range start for this doctor at this branch',
        }),
      );
    }

    if (!table.findColumnByName('week_end_day')) {
      await queryRunner.addColumn(
        'doctor_branches',
        new TableColumn({
          name: 'week_end_day',
          type: 'enum',
          enum: [...DAY_ENUM],
          isNullable: true,
          comment: 'Optional week range end for this doctor at this branch',
        }),
      );
    }

    if (!table.findColumnByName('from_time')) {
      await queryRunner.query(`
        ALTER TABLE \`doctor_branches\`
        ADD COLUMN \`from_time\` time NULL COMMENT 'Optional daily window start at this branch'
      `);
    }

    if (!table.findColumnByName('to_time')) {
      await queryRunner.query(`
        ALTER TABLE \`doctor_branches\`
        ADD COLUMN \`to_time\` time NULL COMMENT 'Optional daily window end at this branch'
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const col of ['to_time', 'from_time', 'week_end_day', 'week_start_day']) {
      const t = await queryRunner.getTable('doctor_branches');
      if (t?.findColumnByName(col)) {
        await queryRunner.dropColumn('doctor_branches', col);
      }
    }
  }
}
