import compression from 'compression';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
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

  app.use(compression());

  try {
    const uploadsPath = join(process.cwd(), 'uploads');
    if (!existsSync(uploadsPath)) {
      mkdirSync(uploadsPath, { recursive: true });
    }
    app.useStaticAssets(uploadsPath, {
      prefix: '/uploads/',
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

  await app.listen(process.env.PORT ?? 3000);
}

await bootstrap();
