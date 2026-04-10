import { describe, it, expect } from 'vitest';
import { createLogger } from './index';

describe('Logger setup', () => {
  it('should create logger successfully', () => {
    const logger = createLogger('test');
    expect(logger).toBeDefined();
  });
});
