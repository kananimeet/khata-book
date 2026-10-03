import 'pg';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { AppModule } from '../dist/app.module.js';
import { TryCatchInterceptor } from '../dist/common/interceptors/try-catch.interceptor.js';
import { ResponseInterceptor } from '../dist/common/interceptors/response.interceptor.js';

const server = express();
let isAppInitialized = false;

async function bootstrap() {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
  );

  app.enableCors({ origin: true, credentials: true });
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(
    new TryCatchInterceptor(),
    new ResponseInterceptor(),
  );

  const config = new DocumentBuilder()
    .setTitle('Khata Book API')
    .setDescription('Khata Book Admin & Authentication API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customCssUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui.min.css',
    customJs: [
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-bundle.js',
      'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.11.0/swagger-ui-standalone-preset.js',
    ],
  });

  await app.init();
  isAppInitialized = true;
}

export default async function handler(req, res) {
  try {
    console.log(`[Vercel Function] Incoming: ${req.method} ${req.url}`);
    if (!isAppInitialized) {
      console.log('[Vercel Function] Initializing NestJS App...');
      await bootstrap();
      console.log('[Vercel Function] NestJS App Initialized successfully!');
    }
    return server(req, res);
  } catch (err) {
    console.error('[Vercel Function] Nest Bootstrap Error:', err);
    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to initialize NestJS application on Vercel',
      error: err?.message || String(err),
      stack: err?.stack,
    });
  }
}
