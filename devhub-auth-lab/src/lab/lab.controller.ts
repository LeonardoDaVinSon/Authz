import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { JwtLabService, VerifierMode } from '../jwt/jwt-lab.service';
import { PasswordLabService } from '../password/password-lab.service';
import { TokenLifecycleService } from '../tokens/token-lifecycle.service';
import { clearInspector, inspectorEntries } from './inspector';
import { assertDemoMode, demoModeEnabled, vulnerableModesEnabled } from './lab-mode';

// Teaching instruments: they explain what happened, they never grant access to anything.
@Controller('lab')
export class LabController {
  constructor(
    private readonly jwtLab: JwtLabService,
    private readonly passwordLab: PasswordLabService,
    private readonly tokens: TokenLifecycleService,
  ) {}

  @Get('config')
  config() {
    return { vulnerableModes: vulnerableModesEnabled(), demoMode: demoModeEnabled() };
  }

  // Wipes every session, refresh-token family and inspector entry so a demo can start clean.
  @Post('reset')
  @HttpCode(200)
  reset(@Req() req: Request) {
    assertDemoMode();
    this.tokens.reset();
    clearInspector();
    return new Promise((resolve, reject) => {
      const store = req.sessionStore as { clear?: (callback: (error?: unknown) => void) => void };
      if (!store.clear) return resolve({ reset: true, sessionsCleared: false });
      store.clear((error) => (error ? reject(error) : resolve({ reset: true, sessionsCleared: true })));
    });
  }

  @Get('inspector')
  inspector() {
    return inspectorEntries();
  }

  @Delete('inspector')
  @HttpCode(204)
  clear() {
    clearInspector();
  }

  @Get('tokens')
  tokenState() {
    assertDemoMode();
    return this.tokens.state();
  }

  @Get('jwt/fixtures')
  fixtures() {
    return this.jwtLab.fixtures();
  }

  @Post('jwt/inspect')
  @HttpCode(200)
  inspect(@Body() body: { token?: string; mode?: string }) {
    const mode = body?.mode ?? 'strict';
    if (mode !== 'strict' && mode !== 'naive') throw new BadRequestException('mode must be "strict" or "naive"');
    if (typeof body?.token !== 'string' || body.token.length === 0 || body.token.length > 8192) {
      throw new BadRequestException('Provide a token up to 8192 characters');
    }
    return this.jwtLab.inspect(body.token, mode as VerifierMode);
  }

  @Get('password/leak')
  leak() {
    return this.passwordLab.leak();
  }

  @Post('password/crack')
  @HttpCode(200)
  crack() {
    return this.passwordLab.crack();
  }
}
