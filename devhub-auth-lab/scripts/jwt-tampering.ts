import * as jwt from 'jsonwebtoken';
import { JwtValidationService } from '../src/jwt/jwt-validation.service';

const service = new JwtValidationService();
const valid = service.issueDemoToken();
console.log('\n[1] Valid token');
console.log(service.verifyAccessToken(valid));

const parts = valid.split('.');
const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
payload.sub = 'admin';
parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
const tampered = parts.join('.');
console.log('\n[2] Tampered payload (sub changed to admin)');
try {
  service.verifyAccessToken(tampered);
  console.error('UNEXPECTED: tampered token was accepted');
  process.exitCode = 1;
} catch {
  console.log('Expected: rejected — signature verification failed');
}

const unsignedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
const unsignedPayload = Buffer.from(JSON.stringify({ sub: 'admin', email: 'admin@example.test', iss: 'devhub-auth-lab', aud: 'devhub-api', exp: Math.floor(Date.now() / 1000) + 60 })).toString('base64url');
const unsigned = `${unsignedHeader}.${unsignedPayload}.`;
console.log('\n[3] Unsigned alg:none token');
try {
  service.verifyAccessToken(unsigned);
  console.error('UNEXPECTED: unsigned token was accepted');
  process.exitCode = 1;
} catch {
  console.log('Expected: rejected — only HS256 is allowed');
}

console.log('\nNote: the lab demonstrates safe rejection, not exploitation of a real service.');
