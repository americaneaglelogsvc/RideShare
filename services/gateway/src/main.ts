import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import * as dotenv from 'dotenv';

// Load environment variables (base → development → local overrides)
dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.development', override: true });
dotenv.config({ path: '../../.env.local', override: true });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:4200',  // rider-app (legacy)
      'http://localhost:4300',  // driver-app (legacy)
      'http://localhost:4400',  // admin-portal (legacy)
      'http://localhost:5173',  // driver-app (vite dev)
      'http://localhost:5174',  // rider-app (vite dev)
      'http://localhost:5175',  // admin-portal (next dev)
      'https://urwaydispatch.com',
      'https://www.urwaydispatch.com',
      'https://admin.urwaydispatch.com',
      'https://driver.urwaydispatch.com',
      'https://rider.urwaydispatch.com',
      /\.urwaydispatch\.com$/,
    ],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }));

  // Performance optimizations
  (app as any).set('trust proxy', 1); // Trust first proxy for Cloud Run
  
  // Increase timeout for load testing
  const httpAdapter = app.getHttpAdapter();
  if (httpAdapter) {
    const server = httpAdapter.getHttpServer();
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000;  // 66 seconds
  }

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('UrWay Dispatch API Gateway')
    .setDescription('API Gateway for the urwaydispatch.com rideshare platform')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 9000;
  await app.listen(port);
  
  console.log(`🚀 Gateway service running on http://localhost:${port}`);
  console.log(`📚 API documentation available at http://localhost:${port}/api`);
}

bootstrap();