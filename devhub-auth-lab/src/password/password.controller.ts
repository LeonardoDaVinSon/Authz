import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PasswordService } from './password.service';

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

function readPassword(body: { password?: unknown } | undefined): string {
  const password = body?.password;
  if (typeof password !== 'string' || password.length < 1 || password.length > 128) {
    throw new BadRequestException('Provide a password between 1 and 128 characters for this local demo.');
  }
  return password;
}

@Controller('password')
export class PasswordController {
  constructor(private readonly passwords: PasswordService) {}

  @Post('hash-demo')
  async hashDemo(@Body() body: { password?: string; cost?: number }) {
    const password = readPassword(body);
    const cost = Number(body?.cost ?? 10);
    const started = Date.now();
    let hash: string;
    try {
      hash = await this.passwords.hashPassword(password, cost);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid cost');
    }
    return {
      hash,
      algorithm: 'bcrypt',
      cost,
      salt: hash.slice(7, 29),
      elapsedMs: Date.now() - started,
      note: 'A password hash is one-way; never log real passwords or hashes from production.',
    };
  }

  @Post('verify-demo')
  @HttpCode(200)
  async verifyDemo(@Body() body: { password?: string; hash?: string }) {
    const password = readPassword(body);
    const hash = body?.hash;
    if (typeof hash !== 'string' || !BCRYPT_HASH.test(hash)) {
      throw new BadRequestException('Provide a bcrypt hash produced by /password/hash-demo.');
    }
    const started = Date.now();
    const match = await this.passwords.verifyPassword(password, hash);
    return {
      match,
      hash,
      elapsedMs: Date.now() - started,
      note: 'bcrypt reads the salt and cost from the stored hash, hashes the input again and compares.',
    };
  }
}
