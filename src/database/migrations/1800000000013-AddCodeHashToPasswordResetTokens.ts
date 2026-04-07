import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCodeHashToPasswordResetTokens1800000000013
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('password_reset_tokens');
    if (!table?.findColumnByName('code_hash')) {
      await queryRunner.query(
        'ALTER TABLE `password_reset_tokens` ADD `code_hash` varchar(255) NULL',
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('password_reset_tokens');
    if (table?.findColumnByName('code_hash')) {
      await queryRunner.query(
        'ALTER TABLE `password_reset_tokens` DROP COLUMN `code_hash`',
      );
    }
  }
}
