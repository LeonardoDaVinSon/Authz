import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();
  it('verifies the original password and rejects a different one', async () => {
    const hash = await service.hashPassword('DevHub-demo-password', 10);
    await expect(service.verifyPassword('DevHub-demo-password', hash)).resolves.toBe(true);
    await expect(service.verifyPassword('not-the-password', hash)).resolves.toBe(false);
  });

  it('produces different salted hashes for the same password', async () => {
    const a = await service.hashPassword('same-password', 10);
    const b = await service.hashPassword('same-password', 10);
    expect(a).not.toBe(b);
    await expect(service.verifyPassword('same-password', a)).resolves.toBe(true);
    await expect(service.verifyPassword('same-password', b)).resolves.toBe(true);
  });

  it('rejects unsupported demo cost factors', async () => {
    await expect(service.hashPassword('password', 3)).rejects.toThrow();
    await expect(service.hashPassword('password', 17)).rejects.toThrow();
  });
});
