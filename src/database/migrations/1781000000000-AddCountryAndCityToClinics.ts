import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableIndex } from 'typeorm';

export class AddCountryAndCityToClinics1781000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');
    
    if (!table) {
      console.log('Table "clinics" does not exist, skipping migration');
      return;
    }

    // Check if country_id column already exists
    const hasCountryIdColumn = table.findColumnByName('country_id');
    if (!hasCountryIdColumn) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'country_id',
          type: 'int',
          isNullable: true,
        }),
      );

      // Add foreign key for country_id
      await queryRunner.createForeignKey(
        'clinics',
        new TableForeignKey({
          columnNames: ['country_id'],
          referencedTableName: 'countries',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        }),
      );

      // Add index for country_id
      await queryRunner.createIndex(
        'clinics',
        new TableIndex({
          name: 'IDX_clinics_country_id',
          columnNames: ['country_id'],
        }),
      );
    }

    // Check if city_id column already exists
    const hasCityIdColumn = table.findColumnByName('city_id');
    if (!hasCityIdColumn) {
      await queryRunner.addColumn(
        'clinics',
        new TableColumn({
          name: 'city_id',
          type: 'int',
          isNullable: true,
        }),
      );

      // Add foreign key for city_id
      await queryRunner.createForeignKey(
        'clinics',
        new TableForeignKey({
          columnNames: ['city_id'],
          referencedTableName: 'cities',
          referencedColumnNames: ['id'],
          onDelete: 'SET NULL',
          onUpdate: 'CASCADE',
        }),
      );

      // Add index for city_id
      await queryRunner.createIndex(
        'clinics',
        new TableIndex({
          name: 'IDX_clinics_city_id',
          columnNames: ['city_id'],
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable('clinics');

    if (!table) {
      return;
    }

    // Remove city_id foreign key and column
    const cityIdForeignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('city_id') !== -1,
    );
    if (cityIdForeignKey) {
      await queryRunner.dropForeignKey('clinics', cityIdForeignKey);
    }

    const cityIdIndex = table.indices.find(
      (idx) => idx.name === 'IDX_clinics_city_id',
    );
    if (cityIdIndex) {
      await queryRunner.dropIndex('clinics', 'IDX_clinics_city_id');
    }

    const hasCityIdColumn = table.findColumnByName('city_id');
    if (hasCityIdColumn) {
      await queryRunner.dropColumn('clinics', 'city_id');
    }

    // Remove country_id foreign key and column
    const countryIdForeignKey = table.foreignKeys.find(
      (fk) => fk.columnNames.indexOf('country_id') !== -1,
    );
    if (countryIdForeignKey) {
      await queryRunner.dropForeignKey('clinics', countryIdForeignKey);
    }

    const countryIdIndex = table.indices.find(
      (idx) => idx.name === 'IDX_clinics_country_id',
    );
    if (countryIdIndex) {
      await queryRunner.dropIndex('clinics', 'IDX_clinics_country_id');
    }

    const hasCountryIdColumn = table.findColumnByName('country_id');
    if (hasCountryIdColumn) {
      await queryRunner.dropColumn('clinics', 'country_id');
    }
  }
}

