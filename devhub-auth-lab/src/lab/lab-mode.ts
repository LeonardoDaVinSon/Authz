import { ForbiddenException } from '@nestjs/common';

export function vulnerableModesEnabled(): boolean {
  return process.env.LAB_VULNERABLE_MODES !== 'false';
}

export function assertVulnerableModesEnabled(): void {
  if (!vulnerableModesEnabled()) {
    throw new ForbiddenException('Vulnerable lab modes are disabled (LAB_VULNERABLE_MODES=false).');
  }
}

export function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE !== 'false';
}

export function assertDemoMode(): void {
  if (!demoModeEnabled()) throw new ForbiddenException('Demo endpoints are disabled (DEMO_MODE=false).');
}
