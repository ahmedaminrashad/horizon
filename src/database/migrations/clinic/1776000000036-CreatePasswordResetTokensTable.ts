import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreatePasswordResetTokensTable1776000000036
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    const has = await queryRunner.hasTable('password_reset_tokens');
    if (has) return;

    await queryRunner.createTable(
      new Table({
        name: 'password_reset_tokens',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          { name: 'jti', type: 'varchar', length: '36' },
          { name: 'user_id', type: 'int' },
          { name: 'expires_at', type: 'datetime' },
          { name: 'used_at', type: 'datetime', isNullable: true },
        ],
      }),
    );

    await queryRunner.createIndex(
      'password_reset_tokens',
      new TableIndex({
        name: 'UQ_password_reset_tokens_jti',
        columnNames: ['jti'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('password_reset_tokens', true);
  }
}
