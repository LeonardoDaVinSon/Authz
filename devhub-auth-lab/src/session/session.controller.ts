import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { DemoUsersService, publicUser, readCredentials } from '../common/demo-users';
import { SESSION_COOKIE_NAME, sessionCookieOptions } from './session.config';

@Controller('session')
export class SessionController {
  constructor(private readonly users: DemoUsersService) {}

  @Post('login')
  async login(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const { email, password } = readCredentials(body);
    const user = await this.users.authenticate(email, password);
    // Same message for unknown email and wrong password: do not reveal which accounts exist.
    if (!user) throw new UnauthorizedException('Invalid email or password');

    // Rotate the session ID after authentication to mitigate session fixation.
    req.session.regenerate((error) => {
      if (error) return res.status(500).json({ message: 'Could not create session' });
      req.session.userId = user.id;
      req.session.username = user.email;
      req.session.role = user.role;
      req.session.save((saveError) => {
        if (saveError) return res.status(500).json({ message: 'Could not save session' });
        return res.json(publicUser(user));
      });
    });
  }

  @Get('me')
  me(@Req() req: Request) {
    const user = this.users.fromSession(req.session);
    if (!user) throw new UnauthorizedException('Session required');
    return publicUser(user);
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy((error) => {
      if (error) return res.status(500).json({ message: 'Could not destroy session' });
      const { maxAge, ...clearOptions } = sessionCookieOptions();
      res.clearCookie(SESSION_COOKIE_NAME, clearOptions);
      return res.status(204).send();
    });
  }
}
