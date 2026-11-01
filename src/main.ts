// Optimize Node.js threadpool size for concurrent crypto/bcrypt and async I/O
process.env.UV_THREADPOOL_SIZE = process.env.UV_THREADPOOL_SIZE || '64';

import cluster from 'node:cluster';
import os from 'node:os';
import compression from 'compression';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { AppModule, ObserveInstrument } from './app.module.js';
import { TryCatchInterceptor } from './common/interceptors/try-catch.interceptor.js';
import { ResponseInterceptor } from './common/interceptors/response.interceptor.js';

async function bootstrap() {
  const isObserveEnabled = Boolean(
    process.env.OBSERVE_APP_KEY &&
      process.env.OBSERVE_APP_KEY !== 'YOUR_APP_KEY',
  );
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule,
    isObserveEnabled ? { instrument: ObserveInstrument } : {},
  );

  // High-performance compression: skip payloads smaller than 1KB to save CPU cycles
  app.use(
    compression({
      threshold: 1024,
      level: 6,
    }),
  );

  // Disable x-powered-by and enable HTTP strong ETag for 304 Not Modified caching
  app.set('x-powered-by', false);
  app.set('etag', 'strong');

  try {
    const uploadsPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsPath)) {
      mkdirSync(uploadsPath, { recursive: true });
    }
    app.useStaticAssets(uploadsPath, {
      prefix: '/uploads/',
      maxAge: 86400000, // 1 day browser cache for static images/uploads
    });
  } catch {
    // Ignore read-only filesystem errors in serverless environments
  }

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
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(`🚀 Khata Book API running on port ${port} (PID: ${process.pid})`, 'Bootstrap');
}

// Cluster mode support for maximum multi-core CPU utilization
if (process.env.CLUSTER_MODE === 'true' && cluster.isPrimary) {
  const numCPUs = process.env.WEB_CONCURRENCY
    ? parseInt(process.env.WEB_CONCURRENCY, 10)
    : Math.min(os.cpus().length, 4);
  Logger.log(`Cluster master ${process.pid} running. Forking ${numCPUs} workers...`, 'Cluster');

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    Logger.warn(
      `Worker ${worker.process.pid} died (${signal || code}). Spawning replacement...`,
      'Cluster',
    );
    cluster.fork();
  });
} else {
  await bootstrap();
}

