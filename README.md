<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

Horizon Backend - A NestJS-based SaaS application with multi-tenant database support for clinic management.

## Features

- 🔐 JWT Authentication & Authorization
- 👥 User Management with Role-Based Access Control (RBAC)
- 🏥 Multi-Tenant SaaS Architecture
- 🗄️ Separate Database per Clinic (Tenant)
- 📦 Database Migrations (Main & Clinic)
- 🔄 Automatic Migration Execution on Clinic Registration

## Project Setup

```bash
$ npm install
```

## Environment Configuration

Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=horizon
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
PORT=3000
```

## Compile and Run the Project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Database Setup

### Seed Database

Run the database seeder to create initial roles, permissions, and admin user:

```bash
$ npm run seed
```

### Database Migrations

#### Generate Migrations

**Generate Clinic Migration:**
```bash
$ npm run migration:generate:clinic <MigrationName>
# Example: npm run migration:generate:clinic CreatePatientsTable
```

**Generate Main Migration:**
```bash
$ npm run migration:generate <MigrationName>
# Example: npm run migration:generate CreateRolesTable
```

#### Run Migrations

**Run Clinic Migrations:**
```bash
$ npm run migration:run:clinic <databaseName>
# Example: npm run migration:run:clinic clinic_user_1
```

**Run Main Migrations:**
```bash
$ npm run migration:run
```

For detailed migration documentation, see [MIGRATIONS.md](./MIGRATIONS.md)

## Run Tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Available Scripts

```bash
# Development
npm run start:dev          # Start in watch mode
npm run start:debug        # Start in debug mode

# Database
npm run seed               # Seed database with initial data
npm run migration:generate # Generate main database migration
npm run migration:generate:clinic # Generate clinic migration
npm run migration:run      # Run main database migrations
npm run migration:run:clinic # Run clinic migrations

# Build & Production
npm run build              # Build the application
npm run start:prod         # Start in production mode

# Code Quality
npm run lint               # Lint and fix code
npm run format             # Format code with Prettier
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Documentation

### Migration Guide
Comprehensive guide for database migrations:
- [MIGRATIONS.md](./MIGRATIONS.md) - Complete migration documentation

### API Documentation
Once the application is running, access Swagger API documentation at:
- http://localhost:3000/api

## Architecture

### Multi-Tenant SaaS Model

The application implements a multi-tenant SaaS architecture where:

1. **Main Database**: Stores users, roles, permissions, and tenant information
2. **Clinic Databases**: Each clinic user gets their own database
3. **Automatic Database Creation**: When a user registers with the "clinic" role, a database is automatically created
4. **Automatic Migrations**: Clinic migrations are automatically run when a new clinic database is created
5. **Dynamic Database Switching**: The system automatically switches to the clinic database based on the authenticated user's role

### Database Naming Convention

Clinic databases follow the pattern: `{username}_{user_id}` (lowercase)

Example:
- User with email `john.doe@example.com` and ID `5` → Database: `john_doe_5`
- User with phone `+1234567890` and ID `3` → Database: `1234567890_3`

## Resources

### Project-Specific
- [MIGRATIONS.md](./MIGRATIONS.md) - Database migrations guide
- [src/database/scripts/README.md](./src/database/scripts/README.md) - Migration scripts documentation

### NestJS Resources
- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
