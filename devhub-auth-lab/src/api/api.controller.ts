import { Controller, ForbiddenException, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { publicUser } from '../common/demo-users';
import { PrincipalService } from './principal.service';

// The DevHub "product" API. Authentication and authorization are decided here, never in the UI.
@Controller('api')
export class ApiController {
  constructor(private readonly principals: PrincipalService) {}

  @Get('me')
  me(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const principal = this.principals.resolve(req, res);
    return { ...publicUser(principal), authenticatedVia: principal.via };
  }

  @Get('admin')
  admin(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const principal = this.principals.resolve(req, res);
    if (principal.role !== 'admin') {
      throw new ForbiddenException(`Authenticated as ${principal.email} (${principal.role}), but this action requires admin`);
    }
    return {
      message: 'Welcome to the DevHub admin area',
      user: publicUser(principal),
      authenticatedVia: principal.via,
      users: 2,
    };
  }
}
