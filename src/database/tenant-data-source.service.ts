import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as mysql from 'mysql2/promise';
import { DatabaseService } from './database.service';

@Injectable()
export class TenantDataSourceService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantDataSourceService.name);
  private dataSources: Map<string, DataSource> = new Map();

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
  ) {}

  /**
   * Get or create DataSource for a tenant database
   */
  async getTenantDataSource(
    databaseName: string | null,
  ): Promise<DataSource | null> {
    // If no database name, return null (will use default)
    if (!databaseName) {
      return null;
    }

    // Check if DataSource already exists
    if (this.dataSources.has(databaseName)) {
      const dataSource = this.dataSources.get(databaseName);
      if (dataSource && dataSource.isInitialized) {
        return dataSource;
      }
      // Remove invalid DataSource
      this.dataSources.delete(databaseName);
    }

    // Verify database exists before creating DataSource
    const sanitizedDbName = this.databaseService.sanitizeDatabaseName(databaseName);
    const dbExists = await this.verifyDatabaseExists(sanitizedDbName);
    
    if (!dbExists) {
      this.logger.error(
        `Database "${sanitizedDbName}" does not exist. Please create it first or run clinic migrations.`,
      );
      return null;
    }

    // Create new DataSource for tenant
    const config = this.databaseService.getTenantDatabaseConfig(databaseName);
    
    this.logger.debug(`Creating DataSource for database: ${sanitizedDbName}`);
    this.logger.debug(`Config: ${JSON.stringify({ ...config, password: '***' })}`);
    
    const dataSource = new DataSource(config as DataSourceOptions);

    try {
      await dataSource.initialize();
      this.dataSources.set(databaseName, dataSource);
      this.logger.log(`Tenant DataSource initialized successfully for: ${databaseName}`);
      return dataSource;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : 'No stack trace';
      
      this.logger.error(
        `Failed to initialize DataSource for "${databaseName}" (sanitized: "${sanitizedDbName}"): ${errorMessage}`,
      );
      this.logger.error(`Error details:`, error);
      this.logger.error(`Stack trace: ${errorStack}`);
      
      // Log configuration details (without password) for debugging
      this.logger.error(`DataSource config used:`, {
        type: config.type,
        host: config.host,
        port: config.port,
        username: config.username,
        database: config.database,
        entitiesCount: Array.isArray(config.entities) ? config.entities.length : 'N/A',
        synchronize: config.synchronize,
      });
      
      // Don't throw, return null so the system can fall back to default database
      return null;
    }
  }

  /**
   * Verify if database exists
   */
  private async verifyDatabaseExists(databaseName: string): Promise<boolean> {
    const connectionConfig = {
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 3306),
      user: this.configService.get('DB_USERNAME', 'root'),
      password: this.configService.get('DB_PASSWORD', ''),
    };

    let connection: mysql.Connection | null = null;

    try {
      connection = await mysql.createConnection(connectionConfig);
      const [rows] = await connection.query(
        `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
        [databaseName],
      );
      return Array.isArray(rows) && rows.length > 0;
    } catch (error) {
      this.logger.error(
        `Error verifying database existence for ${databaseName}:`,
        error instanceof Error ? error.message : String(error),
      );
      return false;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Get repository for tenant database
   */
  async getTenantRepository<T>(
    entity: any,
    databaseName: string | null,
  ): Promise<any> {
    if (!databaseName) {
      return null;
    }

    const dataSource = await this.getTenantDataSource(databaseName);
    if (!dataSource) {
      return null;
    }
    return dataSource.getRepository(entity);
  }

  /**
   * Clean up connections on module destroy
   */
  async onModuleDestroy() {
    for (const [databaseName, dataSource] of this.dataSources.entries()) {
      if (dataSource && dataSource.isInitialized) {
        await dataSource.destroy();
        this.logger.log(`Tenant DataSource destroyed for: ${databaseName}`);
      }
    }
    this.dataSources.clear();
  }
}
