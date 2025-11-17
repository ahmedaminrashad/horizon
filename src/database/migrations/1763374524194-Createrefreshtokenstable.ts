import { MigrationInterface, QueryRunner } from 'typeorm';

export class Createrefreshtokenstable1763374524194 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add your migration logic here
    // Example:
    // await queryRunner.createTable(
    //   new Table({
    //     name: 'example',
    //     columns: [
    //       {
    //         name: 'id',
    //         type: 'int',
    //         isPrimary: true,
    //         isGenerated: true,
    //         generationStrategy: 'increment',
    //       },
    //     ],
    //   }),
    // );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add your rollback logic here
    // Example:
    // await queryRunner.dropTable('example');
  }
}
