import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  if (existsSync('.env')) process.loadEnvFile('.env');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configureApp(app);

  const port = Number(process.env.PORT || 3000);
  await app.listen(port, process.env.HOST || '127.0.0.1');
  console.log(`DevHub Auth Lab listening on http://localhost:${port}`);
  console.log('Demo only: do not expose this server to the internet.');
}

bootstrap();
