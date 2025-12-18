import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { Request, Response, NextFunction } from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Serve static files from uploads directory
  // Note: Static assets are served outside the global prefix
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // Also serve static files under /api/uploads for consistency with API routes
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/api/uploads/',
  });

  // Enable CORS configuration
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  
  // Allowed origins for CORS
  const allowedOrigins = [
    'https://operate.indicator-app.com',
    'https://backend.indicator-app.com',
    'http://localhost:5173',
    'https://medical-six-ashen.vercel.app',
    'https://medical-aful.vercel.app',
  ];

  if (nodeEnv === 'development' || nodeEnv === 'local') {
    // In development, allow all origins
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'lang', 'x-lang'],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  } else {
    // In production, allow only specific origins
    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
          return callback(null, true);
        }
        
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        
        // Allow subdomains of indicator-app.com
        if (origin.match(/^https?:\/\/[^.]+\.indicator-app\.com$/)) {
          return callback(null, true);
        }
        
        // Reject other origins
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'lang', 'x-lang'],
      exposedHeaders: ['Authorization'],
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });
  }

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Horizon Backend API')
    .setDescription('API documentation for Horizon Backend')
    .setVersion('1.1')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('api')
    .addTag('auth')
    .addTag('users')
    .addTag('roles')
    .addTag('permissions')
    .addTag('settings')
    .addTag('upload')
    .addTag('clinic')
    .addTag('packages')
    .addTag('doctors')
    .addTag('patients')
    .addTag('appointments')
    .addTag('clinics')
    .addTag('branches')
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // Disable caching for Swagger JSON endpoint using Express middleware
  app.use(
    '/api/documentation',
    (req: Request, res: Response, next: NextFunction) => {
      if (req.path.endsWith('-json') || req.path.includes('swagger')) {
        res.setHeader(
          'Cache-Control',
          'no-store, no-cache, must-revalidate, private',
        );
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      next();
    },
  );

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: false,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      requestInterceptor: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        apply: function (requestObj: any) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          const headers = requestObj.headers || {};
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          headers['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          headers['Pragma'] = 'no-cache';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          headers['Expires'] = '0';
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          requestObj.headers = headers;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return requestObj;
        },
      },
    },
    customCss: `
      .swagger-ui .topbar { display: none }
    `,
    customSiteTitle: 'Horizon Backend API Documentation',
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();
