import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ApiController } from './api/api.controller';
import { PrincipalService } from './api/principal.service';
import { DemoUsersService } from './common/demo-users';
import { HealthController } from './health.controller';
import { JwtController } from './jwt/jwt.controller';
import { JwtLabService } from './jwt/jwt-lab.service';
import { JwtValidationService } from './jwt/jwt-validation.service';
import { InspectorMiddleware } from './lab/inspector';
import { LabController } from './lab/lab.controller';
import { OidcController } from './oidc/oidc.controller';
import { OidcService } from './oidc/oidc.service';
import { PasswordController } from './password/password.controller';
import { PasswordLabService } from './password/password-lab.service';
import { PasswordService } from './password/password.service';
import { SessionController } from './session/session.controller';
import { SessionLabController } from './session/session-lab.controller';
import { TokenLifecycleService } from './tokens/token-lifecycle.service';
import { TokensController } from './tokens/tokens.controller';

@Module({
  controllers: [
    ApiController,
    HealthController,
    JwtController,
    LabController,
    OidcController,
    PasswordController,
    SessionController,
    SessionLabController,
    TokensController,
  ],
  providers: [
    DemoUsersService,
    JwtLabService,
    JwtValidationService,
    OidcService,
    PasswordLabService,
    PasswordService,
    PrincipalService,
    TokenLifecycleService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(InspectorMiddleware).forRoutes('*');
  }
}
