import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { clinicMigrations } from './migrations/clinic/migrations-list';
import { DatabaseService } from './database.service';

@Injectable()
export class ClinicMigrationService {
  private readonly logger = new Logger(ClinicMigrationService.name);

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {}

  /**
   * Run all clinic migrations on a tenant database
   */
  async runMigrations(databaseName: string): Promise<void> {
    const sanitizedDbName =
      this.databaseService.sanitizeDatabaseName(databaseName);

    this.logger.log(
      `Running clinic migrations on database: ${sanitizedDbName}`,
    );

    // Create DataSource for tenant database (migrations don't need entities)
    const baseConfig =
      this.databaseService.getTenantDatabaseConfig(sanitizedDbName);

    // Add migrations to config (remove entities as migrations don't need them)
    const migrationConfig: DataSourceOptions = {
      type: baseConfig.type,
      host: baseConfig.host,
      port: baseConfig.port,
      username: baseConfig.username,
      password: baseConfig.password,
      database: baseConfig.database,
      migrations: clinicMigrations.map((MigrationClass) => {
        // Return the migration class constructor
        return MigrationClass;
      }),
      migrationsTableName: 'migrations',
      migrationsRun: false, // We'll run migrations manually
    };

    const dataSource = new DataSource(migrationConfig);

    try {
      // Initialize the data source
      await dataSource.initialize();
      this.logger.log(`DataSource initialized for ${sanitizedDbName}`);

      // Check if migrations table exists, if not create it
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      // Check if migrations table exists
      const hasMigrationsTable = await queryRunner.hasTable('migrations');

      if (!hasMigrationsTable) {
        // Create migrations table
        await queryRunner.query(`
          CREATE TABLE IF NOT EXISTS \`migrations\` (
            \`id\` INT AUTO_INCREMENT PRIMARY KEY,
            \`timestamp\` BIGINT NOT NULL,
            \`name\` VARCHAR(255) NOT NULL,
            UNIQUE KEY \`UQ_migrations_timestamp\` (\`timestamp\`),
            UNIQUE KEY \`UQ_migrations_name\` (\`name\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
        this.logger.log('Migrations table created');
      }

      // Get pending migrations (handle case where table is empty)
      let executedMigrations: any[] = [];
      try {
        executedMigrations = await queryRunner.query(
          'SELECT * FROM `migrations` ORDER BY `timestamp` ASC',
        );
      } catch (error) {
        // If query fails, assume no migrations have been executed
        this.logger.warn(
          'Could not query migrations table, assuming no migrations executed',
        );
        executedMigrations = [];
      }

      const executedTimestamps = new Set(
        executedMigrations.map((m: any) => parseInt(m.timestamp)),
      );

      // Run pending migrations
      for (const MigrationClass of clinicMigrations) {
        const migration = new MigrationClass();
        const migrationName = MigrationClass.name;

        // Extract timestamp from migration name (last sequence of digits at the end)
        const timestampMatch = migrationName.match(/(\d+)$/);
        if (!timestampMatch) {
          this.logger.warn(
            `Migration ${migrationName} does not have a timestamp, skipping`,
          );
          continue;
        }

        const timestamp = parseInt(timestampMatch[1]);

        // Check if migration has already been executed
        if (executedTimestamps.has(timestamp)) {
          this.logger.log(
            `Migration ${migrationName} already executed, skipping`,
          );
          continue;
        }

        try {
          // Run the migration
          this.logger.log(`Running migration: ${migrationName}`);
          await migration.up(queryRunner);

          // Record migration execution
          await queryRunner.query(
            'INSERT INTO `migrations` (`timestamp`, `name`) VALUES (?, ?)',
            [timestamp, migrationName],
          );

          this.logger.log(`Migration ${migrationName} completed successfully`);
        } catch (error) {
          this.logger.error(`Error running migration ${migrationName}:`, error);
          throw error;
        }
      }

      await queryRunner.release();
      await dataSource.destroy();

      this.logger.log(
        `All clinic migrations completed for database: ${sanitizedDbName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error running migrations on ${sanitizedDbName}:`,
        error,
      );
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
      throw error;
    }
  }

  /**
   * Get list of pending migrations for a database
   */
  async getPendingMigrations(databaseName: string): Promise<string[]> {
    const sanitizedDbName =
      this.databaseService.sanitizeDatabaseName(databaseName);
    const baseConfig =
      this.databaseService.getTenantDatabaseConfig(sanitizedDbName);

    // Migrations don't need entities
    const dataSource = new DataSource({
      type: baseConfig.type,
      host: baseConfig.host,
      port: baseConfig.port,
      username: baseConfig.username,
      password: baseConfig.password,
      database: baseConfig.database,
      migrations: clinicMigrations.map((MigrationClass) => MigrationClass),
    });

    try {
      await dataSource.initialize();
      const queryRunner = dataSource.createQueryRunner();
      await queryRunner.connect();

      // Check if migrations table exists
      const hasMigrationsTable = await queryRunner.hasTable('migrations');
      let executedMigrations: any[] = [];

      if (hasMigrationsTable) {
        try {
          executedMigrations = await queryRunner.query(
            'SELECT * FROM `migrations` ORDER BY `timestamp` ASC',
          );
        } catch (error) {
          this.logger.warn('Could not query migrations table');
          executedMigrations = [];
        }
      }

      const executedTimestamps = new Set(
        executedMigrations.map((m: any) => parseInt(m.timestamp)),
      );

      const pending: string[] = [];

      for (const MigrationClass of clinicMigrations) {
        const migrationName = MigrationClass.name;
        const timestampMatch = migrationName.match(/(\d+)$/);
        if (timestampMatch) {
          const timestamp = parseInt(timestampMatch[1]);
          if (!executedTimestamps.has(timestamp)) {
            pending.push(migrationName);
          }
        }
      }

      await queryRunner.release();
      await dataSource.destroy();

      return pending;
    } catch (error) {
      if (dataSource.isInitialized) {
        await dataSource.destroy();
      }
      throw error;
    }
  }
}
