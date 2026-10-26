import { PasswordLabService } from './password-lab.service';

describe('PasswordLabService', () => {
  const lab = new PasswordLabService();

  it('leaks identical SHA-256 hashes but different bcrypt hashes for a reused password', async () => {
    const rows = await lab.leak();
    const binh = rows.find((row) => row.username === 'binh')!;
    const chi = rows.find((row) => row.username === 'chi')!;
    expect(binh.sha256).toBe(chi.sha256);
    expect(binh.bcrypt).not.toBe(chi.bcrypt);
    expect(binh.sha256SharedWith).toEqual(['chi']);
  });

  it('cracks every wordlist password from SHA-256 and none outside the wordlist', async () => {
    const report = await lab.crack(200);
    expect(report.sha256.cracked.map((hit) => hit.username).sort()).toEqual(['an', 'binh', 'chi', 'dung']);
    expect(report.neverInWordlist).toEqual(['em']);
    expect(report.bcrypt.guessesTried).toBeGreaterThan(0);
    expect(report.bcrypt.guessesPerSecond).toBeLessThan(report.sha256.guessesPerSecond);
  }, 20_000);
});
