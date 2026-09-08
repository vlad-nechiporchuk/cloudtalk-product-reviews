import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health.controller';
import { ROOT_ENV_PATH } from './root-env-path';

function validateEnv(config: Record<string, unknown>) {
  if (!config.DATABASE_URL) {
    throw new Error(
      `DATABASE_URL is not set (looked for it in ${ROOT_ENV_PATH}) — copy .env.example to .env first.`,
    );
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ROOT_ENV_PATH,
      validate: validateEnv,
    }),
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
