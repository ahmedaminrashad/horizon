import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable CORS configuration
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  
  // Allowed origins for CORS
  const allowedOrigins = [
    'https://operate.indicator-app.com',
    'https://backend.indicator-app.com',
    'http://localhost:5173',
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
    .setVersion('1.0')
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
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/documentation', app, document, {
    swaggerOptions: {
      persistAuthorization: false,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      requestInterceptor: {
        apply: function (requestObj: any) {
          const headers = requestObj.headers || {};
          headers['If-Modified-Since'] = 'Mon, 26 Jul 1997 05:00:00 GMT';
          headers['Cache-Control'] = 'no-cache';
          headers['Pragma'] = 'no-cache';
          requestObj.headers = headers;
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
