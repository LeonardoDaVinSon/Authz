import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { readCredentials } from '../common/demo-users';
import { TokenLifecycleService } from './token-lifecycle.service';

function readRefreshToken(body: { refreshToken?: unknown } | undefined): string {
  const token = body?.refreshToken;
  if (typeof token !== 'string' || token.length === 0 || token.length > 256) {
    throw new BadRequestException('Provide a refreshToken');
  }
  return token;
}

@Controller('tokens')
export class TokensController {
  constructor(private readonly tokens: TokenLifecycleService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { shortLived?: boolean }) {
    const { email, password } = readCredentials(body);
    return this.tokens.login(email, password, body?.shortLived === true);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: { refreshToken?: string; shortLived?: boolean }) {
    return this.tokens.refresh(readRefreshToken(body), body?.shortLived === true);
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Body() body: { refreshToken?: string }) {
    this.tokens.logout(readRefreshToken(body));
  }
}
