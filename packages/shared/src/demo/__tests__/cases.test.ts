import { describe, expect, it } from 'vitest';
import { DEMO_CASES } from '../cases';

describe('demo engine cases', () => {
  for (const c of DEMO_CASES) {
    it(`${c.id} ${c.title}`, () => {
      const r = c.run();
      expect(r.pass, r.detail).toBe(true);
    }, 30_000);
  }
});
