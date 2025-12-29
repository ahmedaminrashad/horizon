import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as mysql from 'mysql2/promise';
// Import clinic entities explicitly
import { User as ClinicUser } from '../clinic/permissions/entities/user.entity';
import { Role as ClinicRole } from '../clinic/permissions/entities/role.entity';
import { Permission as ClinicPermission } from '../clinic/permissions/entities/permission.entity';
import { Doctor } from '../clinic/doctors/entities/doctor.entity';
import { SlotTemplate } from '../clinic/slot-template/entities/slot-template.entity';
import { Reservation } from '../clinic/reservations/entities/reservation.entity';
import { Setting as ClinicSetting } from '../clinic/settings/entities/setting.entity';
import { Branch } from '../clinic/branches/entities/branch.entity';
import { WorkingHour } from '../clinic/working-hours/entities/working-hour.entity';
import { BreakHour } from '../clinic/working-hours/entities/break-hour.entity';

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Create a new database for a tenant
   */
  async createTenantDatabase(databaseName: string): Promise<void> {
    const connectionConfig = {
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 3306),
      user: this.configService.get('DB_USERNAME', 'root'),
      password: this.configService.get('DB_PASSWORD', ''),
    };

    let connection: mysql.Connection | null = null;

    try {
      // Connect without specifying a database
      connection = await mysql.createConnection(connectionConfig);

      // Create database if it doesn't exist
      const sanitizedDbName = this.sanitizeDatabaseName(databaseName);
      await connection.query(
        `CREATE DATABASE IF NOT EXISTS \`${sanitizedDbName}\``,
      );

      this.logger.log(`Database ${sanitizedDbName} created successfully`);

      // Connect to the new database and create tables
      await this.initializeTenantDatabase(sanitizedDbName, connectionConfig);
    } catch (error) {
      this.logger.error(`Error creating database ${databaseName}:`, error);
      throw error;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  /**
   * Initialize tenant database with schema
   * Note: This method is kept for backward compatibility but migrations should be used instead
   * Migrations are now run separately via ClinicMigrationService
   */
  private async initializeTenantDatabase(
    databaseName: string,
    connectionConfig: any,
  ): Promise<void> {
    // Migrations are now handled by ClinicMigrationService
    // This method is kept for backward compatibility
    this.logger.log(
      `Tenant database ${databaseName} created, migrations will be run separately`,
    );
  }

  /**
   * Get tenant database connection configuration
   * Uses explicit entity classes to avoid "Cannot use import statement outside a module" error
   */
  getTenantDatabaseConfig(databaseName: string) {
    // Use explicit entity classes instead of file paths to avoid module loading issues
    const clinicEntities = [
      ClinicUser,
      ClinicRole,
      ClinicPermission,
      Doctor,
      SlotTemplate,
      Reservation,
      ClinicSetting,
      Branch,
      WorkingHour,
      BreakHour,
    ];

    const sanitizedDbName = this.sanitizeDatabaseName(databaseName);

    return {
      type: 'mysql' as const,
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get<number>('DB_PORT', 3306),
      username: this.configService.get('DB_USERNAME', 'root'),
      password: this.configService.get('DB_PASSWORD', ''),
      database: sanitizedDbName,
      entities: clinicEntities,
      synchronize: this.configService.get('NODE_ENV') === 'development',
      autoLoadEntities: false,
      logging:
        this.configService.get('NODE_ENV') === 'development'
          ? ['error', 'warn']
          : false,
      // Add connection pool settings
      extra: {
        connectionLimit: 10,
      },
    };
  }

  /**
   * Sanitize database name to prevent SQL injection
   */
  sanitizeDatabaseName(name: string): string {
    // Remove any characters that are not alphanumeric, underscore, or hyphen
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  /**
   * Generate a unique database name for a user
   * Format: {username}_{userId} (lowercase)
   * Priority: name > email (part before @) > phone
   */
  generateDatabaseName(
    userId: number,
    name?: string,
    email?: string,
    phone?: string,
  ): string {
    // Priority: name > email > phone
    let username = name;

    if (!username && email) {
      // Extract username from email (part before @)
      username = email.split('@')[0];
    }

    if (!username && phone) {
      // Use phone as fallback
      username = phone;
    }

    if (!username) {
      // Final fallback to 'user'
      return `user_${userId}`.toLowerCase();
    }

    // Sanitize username: remove special characters, keep alphanumeric and underscores
    let sanitizedUsername = username.replace(/[^a-zA-Z0-9_]/g, '_');

    // Remove consecutive underscores and trim
    sanitizedUsername = sanitizedUsername
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');

    // If username is empty after sanitization, use 'user' as fallback
    if (!sanitizedUsername || sanitizedUsername.length === 0) {
      sanitizedUsername = 'user';
    }

    // Format as {username}_{userId} in lowercase
    const databaseName = `${sanitizedUsername}_${userId}`.toLowerCase();

    return databaseName;
  }
}
