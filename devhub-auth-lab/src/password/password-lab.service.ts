import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

export const LEAK_BCRYPT_COST = 12;
export const REAL_WORDLIST_SIZE = 14_344_391;

const LEAKED_ACCOUNTS = [
  { username: 'an', password: 'password123' },
  { username: 'binh', password: 'Summer2024!' },
  { username: 'chi', password: 'Summer2024!' },
  { username: 'dung', password: 'iloveyou' },
  { username: 'em', password: 'violet-tram-quarry-41' },
];

export const DEMO_WORDLIST = [
  '123456', 'password', 'password123', 'qwerty', '111111', 'abc123', 'letmein', 'welcome', 'admin', 'iloveyou',
  'monkey', 'dragon', 'football', '12345678', 'sunshine', 'princess', 'Password1', 'Summer2024!', 'Winter2024!', 'devhub',
  'trustno1', 'baseball', 'master', 'shadow', 'qwerty123',
];

export interface LeakedRow {
  username: string;
  plaintext: string;
  sha256: string;
  bcrypt: string;
  sha256SharedWith: string[];
}

export interface CrackHit {
  username: string;
  password: string;
  afterGuesses: number;
}

export interface CrackReport {
  wordlistSize: number;
  accounts: number;
  realWordlistSize: number;
  sha256: { guessesTried: number; elapsedMs: number; guessesPerSecond: number; cracked: CrackHit[]; realWordlistSeconds: number };
  bcrypt: {
    cost: number;
    guessesTried: number;
    elapsedMs: number;
    guessesPerSecond: number;
    cracked: CrackHit[];
    finished: boolean;
    budgetMs: number;
    estimatedFullRunSeconds: number;
    realWordlistSecondsPerAccount: number;
  };
  neverInWordlist: string[];
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class PasswordLabService {
  private leakPromise: Promise<LeakedRow[]> | null = null;

  leak(): Promise<LeakedRow[]> {
    this.leakPromise ??= this.buildLeak();
    return this.leakPromise;
  }

  async crack(budgetMs = 3000): Promise<CrackReport> {
    const rows = await this.leak();

    // Unsalted: one hash per guess is compared against every account at once.
    const byHash = new Map<string, string[]>();
    for (const row of rows) byHash.set(row.sha256, [...(byHash.get(row.sha256) ?? []), row.username]);
    const shaCracked: CrackHit[] = [];
    const shaStart = performance.now();
    DEMO_WORDLIST.forEach((word, index) => {
      for (const username of byHash.get(sha256(word)) ?? []) shaCracked.push({ username, password: word, afterGuesses: index + 1 });
    });
    const shaElapsed = performance.now() - shaStart;

    const rateSamples = 200_000;
    const rateStart = performance.now();
    for (let i = 0; i < rateSamples; i += 1) sha256(`candidate-${i}`);
    const shaRate = rateSamples / ((performance.now() - rateStart) / 1000);

    // Salted: each account needs its own guesses because the salt differs.
    const bcryptCracked: CrackHit[] = [];
    let guesses = 0;
    let finished = true;
    const bcryptStart = performance.now();
    outer: for (const row of rows) {
      for (const word of DEMO_WORDLIST) {
        if (performance.now() - bcryptStart > budgetMs) {
          finished = false;
          break outer;
        }
        guesses += 1;
        if (await bcrypt.compare(word, row.bcrypt)) {
          bcryptCracked.push({ username: row.username, password: word, afterGuesses: guesses });
          break;
        }
      }
    }
    const bcryptElapsed = performance.now() - bcryptStart;
    const bcryptRate = guesses / Math.max(bcryptElapsed / 1000, 0.001);

    return {
      wordlistSize: DEMO_WORDLIST.length,
      accounts: rows.length,
      realWordlistSize: REAL_WORDLIST_SIZE,
      sha256: {
        guessesTried: DEMO_WORDLIST.length,
        elapsedMs: Math.round(shaElapsed * 100) / 100,
        guessesPerSecond: Math.round(shaRate),
        cracked: shaCracked,
        realWordlistSeconds: Math.round(REAL_WORDLIST_SIZE / shaRate),
      },
      bcrypt: {
        cost: LEAK_BCRYPT_COST,
        guessesTried: guesses,
        elapsedMs: Math.round(bcryptElapsed),
        guessesPerSecond: Math.round(bcryptRate * 10) / 10,
        cracked: bcryptCracked,
        finished,
        budgetMs,
        estimatedFullRunSeconds: Math.round((rows.length * DEMO_WORDLIST.length) / bcryptRate),
        realWordlistSecondsPerAccount: Math.round(REAL_WORDLIST_SIZE / bcryptRate),
      },
      neverInWordlist: rows.filter((row) => !DEMO_WORDLIST.includes(row.plaintext)).map((row) => row.username),
    };
  }

  private async buildLeak(): Promise<LeakedRow[]> {
    const rows = await Promise.all(
      LEAKED_ACCOUNTS.map(async ({ username, password }) => ({
        username,
        plaintext: password,
        sha256: sha256(password),
        bcrypt: await bcrypt.hash(password, LEAK_BCRYPT_COST),
        sha256SharedWith: [] as string[],
      })),
    );
    for (const row of rows) {
      row.sha256SharedWith = rows.filter((other) => other !== row && other.sha256 === row.sha256).map((other) => other.username);
    }
    return rows;
  }
}
