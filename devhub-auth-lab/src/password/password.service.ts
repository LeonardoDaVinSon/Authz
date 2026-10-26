import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class PasswordService {
  async hashPassword(password: string, cost = 10): Promise<string> {
    if (!Number.isInteger(cost) || cost < 4 || cost > 16) {
      throw new Error('Demo cost must be between 4 and 16');
    }
    return bcrypt.hash(password, cost);
  }

  async verifyPassword(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
