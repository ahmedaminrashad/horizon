import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
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

    // Create new DataSource for tenant
    const config = this.databaseService.getTenantDatabaseConfig(databaseName);
    const dataSource = new DataSource(config as DataSourceOptions);

    try {
      await dataSource.initialize();
      this.dataSources.set(databaseName, dataSource);
      this.logger.log(`Tenant DataSource initialized for: ${databaseName}`);
      return dataSource;
    } catch (error) {
      this.logger.error(
        `Failed to initialize DataSource for ${databaseName}:`,
        error,
      );
      throw error;
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
