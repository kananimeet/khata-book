// Optimize Node.js threadpool size on Vercel for bcrypt and crypto operations
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '64';

import 'pg';
import compression from 'compression';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import { AppModule } from '../dist/app.module.js';
import { TryCatchInterceptor } from '../dist/common/interceptors/try-catch.interceptor.js';
import { ResponseInterceptor } from '../dist/common/interceptors/response.interceptor.js';

const server = express();
server.use(
  compression({
    threshold: 1024,
    level: 6,
  }),
);
server.set('x-powered-by', false);
server.set('etag', 'strong');

let bootstrapPromise = null;

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
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
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
}

async function getInitializedServer() {
  if (!bootstrapPromise) {
    bootstrapPromise = bootstrap();
  }
  await bootstrapPromise;
  return server;
}

export default async function handler(req, res) {
  try {
    await getInitializedServer();

    // Auto-prefix /api/v1 if client called without it (e.g. /auth/check-email -> /api/v1/auth/check-email)
    if (
      !req.url.startsWith('/api/v1') &&
      !req.url.startsWith('/api/docs') &&
      !req.url.startsWith('/favicon')
    ) {
      if (req.url.startsWith('/api/')) {
        req.url = req.url.replace('/api/', '/api/v1/');
      } else {
        req.url = '/api/v1' + (req.url.startsWith('/') ? req.url : '/' + req.url);
      }
    }

    return server(req, res);
  } catch (err) {
    console.error('[Vercel Function] Error:', err);
    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to initialize NestJS application on Vercel',
      error: err?.message || String(err),
    });
  }
}

