import { ForbiddenException } from '@nestjs/common';
import { JwtLabService } from './jwt-lab.service';
import { JwtValidationService } from './jwt-validation.service';

describe('JwtLabService', () => {
  const lab = new JwtLabService(new JwtValidationService());
  const fixtures = lab.fixtures();
  const fixture = (id: string) => fixtures.find((item) => item.id === id)!.token;

  afterEach(() => {
    delete process.env.LAB_VULNERABLE_MODES;
  });

  it.each(fixtures.map((item) => [item.id, item.failsAt]))('strict mode stops %s at %s', (id, failsAt) => {
    const result = lab.inspect(fixture(id as string), 'strict');
    const failed = result.steps.filter((step) => step.state === 'fail').map((step) => step.id);

    if (failsAt === null) {
      expect(result.accepted).toBe(true);
      expect(failed).toEqual([]);
    } else {
      expect(result.accepted).toBe(false);
      expect(result.httpStatus).toBe(401);
      expect(failed).toEqual([failsAt, 'library']);
      expect(result.publicResponse).toEqual({ statusCode: 401, message: 'Invalid access token', error: 'Unauthorized' });
    }
  });

  it('naive mode accepts a tampered admin role', () => {
    const result = lab.inspect(fixture('tampered'), 'naive');
    expect(result.accepted).toBe(true);
    expect(result.publicResponse).toMatchObject({ role: 'admin' });
    expect(result.steps.filter((step) => step.state === 'skipped')).toHaveLength(7);
  });

  it('naive mode accepts alg none', () => {
    expect(lab.inspect(fixture('alg-none'), 'naive').accepted).toBe(true);
  });

  it('rejects garbage in both modes', () => {
    expect(lab.inspect('not-a-jwt', 'strict').accepted).toBe(false);
    expect(lab.inspect('not-a-jwt', 'naive').accepted).toBe(false);
  });

  it('refuses naive mode when vulnerable modes are disabled', () => {
    process.env.LAB_VULNERABLE_MODES = 'false';
    expect(() => lab.inspect(fixture('valid'), 'naive')).toThrow(ForbiddenException);
    expect(lab.inspect(fixture('valid'), 'strict').accepted).toBe(true);
  });
});
