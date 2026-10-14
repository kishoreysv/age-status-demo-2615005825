/** Exercise every validator branch, exact representation and untrusted notation. */
import { describe, expect, it } from 'vitest';
import { classifyAge } from './classifyAge';

describe('classifyAge', () => {
  it.each([
    ['0', 0, 'Minor'], ['17', 17, 'Minor'], ['18', 18, 'Major'], ['19', 19, 'Major'],
    ['000', 0, 'Minor'], ['0017', 17, 'Minor'], [' 0018 ', 18, 'Major'],
    ['\t19\n', 19, 'Major'], ['200', 200, 'Major'],
    ['9007199254740991', Number.MAX_SAFE_INTEGER, 'Major'],
    ['0009007199254740991', Number.MAX_SAFE_INTEGER, 'Major'],
  ])('accepts %j as normalized age %s and %s', (raw, age, status) => {
    expect(classifyAge(raw as string)).toEqual({ valid: true, result: { age, status } });
  });

  it.each([
    '', ' ', '\n\t', '-1', '-0', '+18', '17.5', '18.0', '.5', 'abc', '1e2', '1E2',
    '0x12', '0b10010', '1_000', '1,000', '1 8', '18\n19', 'NaN', 'Infinity',
    '１８', '١٨', '<script>alert(1)</script>', "' OR 1=1 --", '../18', '18\u0000',
  ])('rejects non-digit input %j with a fixed non-echoing error', (raw) => {
    expect(classifyAge(raw)).toEqual({
      valid: false, error: 'Enter a non-negative whole-number age using digits only.',
    });
  });

  it.each(['9007199254740992', '9007199254740993', '0009007199254740992', '9'.repeat(400)])(
    'rejects unsafe or infinite digit input without rounding: %j', (raw) => {
      expect(classifyAge(raw)).toEqual({
        valid: false,
        error: 'Enter a whole-number age that can be represented exactly (up to 9007199254740991).',
      });
    },
  );
});
