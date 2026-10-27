import { BadRequestException, Controller, Get, HttpCode, NotFoundException, Post, Query, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from '../session/session.config';
import { OidcSettings, oidcSettings } from './oidc-settings';
import { resolveExtraScopes } from './oidc-scopes';
import { classifyCallbackError, errorDetail, OIDC_TRANSACTION_TTL_MS, OidcFailure, OidcService } from './oidc.service';

function requireSettings(): OidcSettings {
  const settings = oidcSettings();
  if (!settings) throw new NotFoundException('OIDC is not configured: set OIDC_ISSUER_URL and OIDC_CLIENT_ID');
  return settings;
}

function returnUrl(settings: OidcSettings, failure?: OidcFailure, detail?: unknown): string {
  const url = new URL(settings.returnTo);
  url.searchParams.set('oidc', failure ? 'error' : 'ok');
  if (failure) url.searchParams.set('reason', failure);
  // Only short IdP error codes such as access_denied are echoed back.
  if (typeof detail === 'string' && /^[\w.-]{1,64}$/.test(detail)) url.searchParams.set('detail', detail);
  return url.href;
}

@Controller('oidc')
export class OidcController {
  constructor(private readonly oidc: OidcService) {}

  @Get('status')
  status() {
    return this.oidc.status();
  }

  @Get('login')
  async login(@Req() req: Request, @Res() res: Response, @Query('extra') extra?: string) {
    const settings = requireSettings();
    const extras = resolveExtraScopes(extra, settings.issuer);
    let started;
    try {
      started = await this.oidc.startLogin(settings, extras);
    } catch {
      return res.redirect(returnUrl(settings, 'discovery_failed'));
    }
    req.session.oidcTransaction = started.transaction;
    req.session.save((error) => {
      if (error) return res.status(500).json({ message: 'Could not save session' });
      return res.redirect(started.url.href);
    });
  }

  @Get('callback')
  async callback(@Req() req: Request, @Res() res: Response) {
    const settings = requireSettings();
    // Single use: the transaction is consumed whatever the outcome.
    const transaction = req.session.oidcTransaction;
    delete req.session.oidcTransaction;
    const fail = (failure: OidcFailure, detail?: unknown) => req.session.save(() => res.redirect(returnUrl(settings, failure, detail)));

    if (req.query.error !== undefined) return fail('idp_error', req.query.error);
    if (!transaction) return fail('no_transaction');
    if (Date.now() - transaction.startedAt > OIDC_TRANSACTION_TTL_MS) return fail('transaction_expired');
    if (req.query.state !== transaction.state) return fail('state_mismatch');

    // Rebuild the callback URL from the registered redirect URI so a proxy or Docker port mapping cannot change it.
    const callbackUrl = new URL(settings.redirectUri);
    callbackUrl.search = new URL(req.originalUrl, 'http://callback.invalid').search;

    let result;
    try {
      result = await this.oidc.finishLogin(settings, callbackUrl, transaction);
    } catch (error) {
      const failure = classifyCallbackError(error);
      console.warn(`OIDC callback rejected (${failure}): ${errorDetail(error)}`);
      return fail(failure);
    }

    // New session ID after authentication, as with the password login.
    req.session.regenerate((error) => {
      if (error) return res.redirect(returnUrl(settings, 'session_failed'));
      req.session.userId = result.user.id;
      req.session.username = result.user.email;
      req.session.role = result.user.role;
      req.session.oidcUser = result.user;
      req.session.oidcLogin = result.summary;
      req.session.oidcAccessToken = result.access;
      req.session.save((saveError) => res.redirect(returnUrl(settings, saveError ? 'session_failed' : undefined)));
    });
  }

  @Get('session')
  session(@Req() req: Request) {
    const login = req.session.oidcLogin;
    if (!login || req.session.userId !== login.user.id) throw new UnauthorizedException('No OIDC login in this session');
    return login;
  }

  // Teaching instrument: use the IdP access token against a real resource API (Google Drive).
  @Get('resource/drive')
  async driveResource(@Req() req: Request) {
    const login = req.session.oidcLogin;
    const access = req.session.oidcAccessToken;
    if (!login || !access || req.session.userId !== login.user.id) {
      throw new UnauthorizedException('No OIDC access token in this session — sign in again');
    }
    if (!login.accessToken.extraScopeIds.some((id) => id.startsWith('drive.'))) {
      throw new BadRequestException('Sign in again with a Drive scope checked to call this resource');
    }
    return this.oidc.callDriveResource(access);
  }

  // Ends the DevHub session (and the retained Google access token). The IdP session survives unless the browser also visits endSessionUrl.
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const settings = oidcSettings();
    const endSessionUrl = settings ? await this.oidc.endSessionUrl(settings) : null;
    await new Promise<void>((resolve, reject) => req.session.destroy((error) => (error ? reject(error) : resolve())));
    const { maxAge, ...clearOptions } = sessionCookieOptions();
    res.clearCookie(SESSION_COOKIE_NAME, clearOptions);
    return { loggedOut: true, endSessionUrl };
  }
}
