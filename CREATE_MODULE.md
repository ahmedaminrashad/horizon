# Guide: Creating a New Module

This guide explains how to create a new module in the Horizon Backend application following the established patterns and conventions.

## Table of Contents

1. [Overview](#overview)
2. [Module Structure](#module-structure)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [File Templates](#file-templates)
5. [Permissions Setup](#permissions-setup)
6. [Database Migrations](#database-migrations)
7. [Best Practices](#best-practices)

## Overview

A module in this NestJS application typically consists of:
- **Entity** (Database model)
- **DTOs** (Data Transfer Objects for validation)
- **Service** (Business logic)
- **Controller** (HTTP endpoints)
- **Module** (NestJS module configuration)
- **Migration** (Database schema changes)

## Module Structure

```
src/
└── {module-name}/
    ├── entities/
    │   └── {module-name}.entity.ts
    ├── dto/
    │   ├── create-{module-name}.dto.ts
    │   ├── update-{module-name}.dto.ts
    │   └── pagination-query.dto.ts
    ├── {module-name}.service.ts
    ├── {module-name}.controller.ts
    └── {module-name}.module.ts
```

## Step-by-Step Guide

### Step 1: Create Directory Structure

Create the module directory and subdirectories:

```bash
mkdir -p src/{module-name}/entities
mkdir -p src/{module-name}/dto
```

**Example:**
```bash
mkdir -p src/products/entities
mkdir -p src/products/dto
```

### Step 2: Create Entity

Create the entity file that defines your database table structure.

**File:** `src/{module-name}/entities/{module-name}.entity.ts`

```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('{table_name}')
export class {EntityName} {
  @PrimaryGeneratedColumn()
  id: number;

  // Add your columns here
  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Example:** `src/products/entities/product.entity.ts`

### Step 3: Create DTOs

Create Data Transfer Objects for request validation.

#### Create DTO
**File:** `src/{module-name}/dto/create-{module-name}.dto.ts`

```typescript
import { IsString, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Create{EntityName}Dto {
  @ApiProperty({ example: 'Example Name', description: 'Entity name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  // Add other fields with validation decorators
}
```

#### Update DTO
**File:** `src/{module-name}/dto/update-{module-name}.dto.ts`

```typescript
import { PartialType } from '@nestjs/swagger';
import { Create{EntityName}Dto } from './create-{module-name}.dto';

export class Update{EntityName}Dto extends PartialType(Create{EntityName}Dto) {}
```

#### Pagination DTO (if needed)
**File:** `src/{module-name}/dto/pagination-query.dto.ts`

```typescript
import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
```

### Step 4: Create Service

Create the service that contains business logic.

**File:** `src/{module-name}/{module-name}.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { {EntityName} } from './entities/{module-name}.entity';
import { Create{EntityName}Dto } from './dto/create-{module-name}.dto';
import { Update{EntityName}Dto } from './dto/update-{module-name}.dto';

@Injectable()
export class {EntityName}Service {
  constructor(
    @InjectRepository({EntityName})
    private {moduleName}Repository: Repository<{EntityName}>,
  ) {}

  async create(createDto: Create{EntityName}Dto): Promise<{EntityName}> {
    const entity = this.{moduleName}Repository.create(createDto);
    return this.{moduleName}Repository.save(entity);
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await this.{moduleName}Repository.findAndCount({
      skip,
      take: limit,
      order: {
        createdAt: 'DESC',
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: number): Promise<{EntityName}> {
    const entity = await this.{moduleName}Repository.findOne({
      where: { id },
    });

    if (!entity) {
      throw new NotFoundException(`{EntityName} with ID ${id} not found`);
    }

    return entity;
  }

  async update(id: number, updateDto: Update{EntityName}Dto): Promise<{EntityName}> {
    const entity = await this.findOne(id);
    Object.assign(entity, updateDto);
    return this.{moduleName}Repository.save(entity);
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.{moduleName}Repository.remove(entity);
  }
}
```

### Step 5: Create Controller

Create the controller that defines HTTP endpoints.

**File:** `src/{module-name}/{module-name}.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { {EntityName}Service } from './{module-name}.service';
import { Create{EntityName}Dto } from './dto/create-{module-name}.dto';
import { Update{EntityName}Dto } from './dto/update-{module-name}.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Permission } from '../permissions/enums/permission.enum';

@ApiTags('{module-name}')
@Controller('{module-name}')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class {EntityName}Controller {
  constructor(private readonly {moduleName}Service: {EntityName}Service) {}

  @Post()
  @Permissions(Permission.CREATE_{MODULE_NAME_UPPER} as string)
  @ApiOperation({ summary: 'Create a new {module-name}' })
  @ApiResponse({ status: 201, description: '{EntityName} created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(@Body() createDto: Create{EntityName}Dto) {
    return this.{moduleName}Service.create(createDto);
  }

  @Get()
  @Permissions(Permission.READ_{MODULE_NAME_UPPER} as string)
  @ApiOperation({ summary: 'Get all {module-name} with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'List of {module-name}' })
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    const page = paginationQuery.page || 1;
    const limit = paginationQuery.limit || 10;
    return this.{moduleName}Service.findAll(page, limit);
  }

  @Get(':id')
  @Permissions(Permission.READ_{MODULE_NAME_UPPER} as string)
  @ApiOperation({ summary: 'Get a {module-name} by ID' })
  @ApiResponse({ status: 200, description: '{EntityName} found' })
  @ApiResponse({ status: 404, description: '{EntityName} not found' })
  findOne(@Param('id') id: string) {
    return this.{moduleName}Service.findOne(+id);
  }

  @Patch(':id')
  @Permissions(Permission.UPDATE_{MODULE_NAME_UPPER} as string)
  @ApiOperation({ summary: 'Update a {module-name}' })
  @ApiResponse({ status: 200, description: '{EntityName} updated successfully' })
  @ApiResponse({ status: 404, description: '{EntityName} not found' })
  update(@Param('id') id: string, @Body() updateDto: Update{EntityName}Dto) {
    return this.{moduleName}Service.update(+id, updateDto);
  }

  @Delete(':id')
  @Permissions(Permission.DELETE_{MODULE_NAME_UPPER} as string)
  @ApiOperation({ summary: 'Delete a {module-name}' })
  @ApiResponse({ status: 200, description: '{EntityName} deleted successfully' })
  @ApiResponse({ status: 404, description: '{EntityName} not found' })
  remove(@Param('id') id: string) {
    return this.{moduleName}Service.remove(+id);
  }
}
```

### Step 6: Create Module

Create the NestJS module that wires everything together.

**File:** `src/{module-name}/{module-name}.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { {EntityName}Service } from './{module-name}.service';
import { {EntityName}Controller } from './{module-name}.controller';
import { {EntityName} } from './entities/{module-name}.entity';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([{EntityName}]),
    UsersModule,
  ],
  controllers: [{EntityName}Controller],
  providers: [{EntityName}Service, PermissionsGuard],
  exports: [{EntityName}Service],
})
export class {EntityName}Module {}
```

### Step 7: Register Module in AppModule

Add your new module to the main application module.

**File:** `src/app.module.ts`

```typescript
import { {EntityName}Module } from './{module-name}/{module-name}.module';

@Module({
  imports: [
    // ... other modules
    {EntityName}Module,
  ],
  // ...
})
export class AppModule {}
```

## Permissions Setup

### Step 1: Add Permissions to Enum

Add permission constants to the permission enum.

**File:** `src/permissions/enums/permission.enum.ts`

```typescript
export enum Permission {
  // ... existing permissions

  // {EntityName} permissions
  CREATE_{MODULE_NAME_UPPER} = 'create-{module-name}',
  READ_{MODULE_NAME_UPPER} = 'read-{module-name}',
  UPDATE_{MODULE_NAME_UPPER} = 'update-{module-name}',
  DELETE_{MODULE_NAME_UPPER} = 'delete-{module-name}',
}
```

### Step 2: Create Migration for Permissions

Create a migration to add permissions to the database.

**File:** `src/database/migrations/{timestamp}-Add{EntityName}Permissions.ts`

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Add{EntityName}Permissions{Timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const permissions = [
      {
        name: 'Create {EntityName}',
        slug: 'create-{module-name}',
        description: 'Allows creating new {module-name}',
      },
      {
        name: 'Read {EntityName}',
        slug: 'read-{module-name}',
        description: 'Allows reading {module-name} information',
      },
      {
        name: 'Update {EntityName}',
        slug: 'update-{module-name}',
        description: 'Allows updating {module-name} information',
      },
      {
        name: 'Delete {EntityName}',
        slug: 'delete-{module-name}',
        description: 'Allows deleting {module-name}',
      },
    ];

    for (const perm of permissions) {
      const existingPermission = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug = ? LIMIT 1`,
        [perm.slug],
      );

      if (existingPermission.length === 0) {
        await queryRunner.query(
          `INSERT INTO permissions (name, slug, description, createdAt, updatedAt) 
           VALUES (?, ?, ?, NOW(), NOW())`,
          [perm.name, perm.slug, perm.description],
        );
        console.log(`Created permission: ${perm.slug}`);
      }
    }

    // Assign permissions to admin role
    const adminRole = await queryRunner.query(
      `SELECT id FROM roles WHERE slug = 'admin' LIMIT 1`,
    );

    if (adminRole.length > 0) {
      const roleId = adminRole[0].id;
      const permissionSlugs = permissions.map((p) => p.slug);
      const placeholders = permissionSlugs.map(() => '?').join(',');
      const permissionIds = await queryRunner.query(
        `SELECT id FROM permissions WHERE slug IN (${placeholders})`,
        permissionSlugs,
      );

      for (const permission of permissionIds) {
        const existingRelation = await queryRunner.query(
          `SELECT * FROM role_permissions 
           WHERE role_id = ? AND permission_id = ? LIMIT 1`,
          [roleId, permission.id],
        );

        if (existingRelation.length === 0) {
          await queryRunner.query(
            `INSERT INTO role_permissions (role_id, permission_id) 
             VALUES (?, ?)`,
            [roleId, permission.id],
          );
        }
      }
    }

    console.log('{EntityName} permissions added successfully!');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove permissions
    await queryRunner.query(
      `DELETE FROM role_permissions WHERE permission_id IN 
       (SELECT id FROM permissions WHERE slug IN ('create-{module-name}', 'read-{module-name}', 'update-{module-name}', 'delete-{module-name}'))`,
    );

    await queryRunner.query(
      `DELETE FROM permissions WHERE slug IN ('create-{module-name}', 'read-{module-name}', 'update-{module-name}', 'delete-{module-name}')`,
    );
  }
}
```

## Database Migrations

### Step 1: Create Table Migration

Create a migration to create the database table.

**File:** `src/database/migrations/{timestamp}-Create{EntityName}Table.ts`

```typescript
import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class Create{EntityName}Table{Timestamp} implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: '{table_name}',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          // Add other columns
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('{table_name}');
  }
}
```

### Step 2: Run Migrations

After creating migrations, run them:

```bash
npm run migration:run
```

## Complete Example: Creating a "Products" Module

Here's a complete example of creating a "Products" module:

### 1. Entity
**File:** `src/products/entities/product.entity.ts`
```typescript
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 2. DTOs
**Create:** `src/products/dto/create-product.dto.ts`
**Update:** `src/products/dto/update-product.dto.ts`
**Pagination:** `src/products/dto/pagination-query.dto.ts`

### 3. Service
**File:** `src/products/products.service.ts`

### 4. Controller
**File:** `src/products/products.controller.ts`

### 5. Module
**File:** `src/products/products.module.ts`

### 6. Permissions Enum
Add to `src/permissions/enums/permission.enum.ts`:
```typescript
CREATE_PRODUCT = 'create-product',
READ_PRODUCT = 'read-product',
UPDATE_PRODUCT = 'update-product',
DELETE_PRODUCT = 'delete-product',
```

### 7. Migration
**File:** `src/database/migrations/{timestamp}-CreateProductsTable.ts`

### 8. Permissions Migration
**File:** `src/database/migrations/{timestamp}-AddProductPermissions.ts`

### 9. Register in AppModule
Add `ProductsModule` to `src/app.module.ts` imports

## Best Practices

1. **Naming Conventions:**
   - Module directory: lowercase, plural (e.g., `products`)
   - Entity class: PascalCase, singular (e.g., `Product`)
   - Table name: lowercase, plural, snake_case (e.g., `products`)
   - Service: PascalCase + "Service" (e.g., `ProductsService`)
   - Controller: PascalCase + "Controller" (e.g., `ProductsController`)

2. **File Organization:**
   - Keep entities in `entities/` directory
   - Keep DTOs in `dto/` directory
   - Main files (service, controller, module) at module root

3. **Validation:**
   - Always use class-validator decorators in DTOs
   - Add ApiProperty decorators for Swagger documentation

4. **Error Handling:**
   - Use appropriate HTTP status codes
   - Throw NotFoundException for missing resources
   - Throw ConflictException for duplicate entries

5. **Security:**
   - Always use JwtAuthGuard on controllers
   - Add PermissionsGuard for permission-based access control
   - Add @Permissions decorator to each endpoint

6. **Database:**
   - Always include `createdAt` and `updatedAt` timestamps
   - Use appropriate column types and constraints
   - Add indexes for frequently queried fields

7. **Migrations:**
   - Always provide both `up()` and `down()` methods
   - Check for existing data before creating
   - Use descriptive migration names

## Quick Reference Checklist

- [ ] Create module directory structure
- [ ] Create entity file with TypeORM decorators
- [ ] Create DTOs (create, update, pagination if needed)
- [ ] Create service with CRUD methods
- [ ] Create controller with REST endpoints
- [ ] Create module file
- [ ] Register module in AppModule
- [ ] Add permissions to Permission enum
- [ ] Create table migration
- [ ] Create permissions migration
- [ ] Add PermissionsGuard to module
- [ ] Add @Permissions decorators to controller endpoints
- [ ] Run migrations
- [ ] Test endpoints

## Related Documentation

- [NestJS Modules](https://docs.nestjs.com/modules)
- [TypeORM Entities](https://typeorm.io/entities)
- [Database Migrations Guide](./MIGRATIONS.md)
- [Migration Scripts](./src/database/scripts/README.md)
