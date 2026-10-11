import { describe, expect, it } from 'vitest';

import { getProfileInitials } from './get-profile-initials';

describe('getProfileInitials', () => {
  it.each([
    ['john', 'J'],
    ['john doe', 'JD'],
    ['john ronald tolkien', 'JR'],
    ['  john    doe  ', 'JD'],
    ['@john doe', 'JD'],
    ['42 club', '4C'],
    ['élodie żak', 'ÉŻ'],
  ])('builds initials for %j', (name, initials) => {
    expect(getProfileInitials(name)).toBe(initials);
  });

  it('skips a word without letters or digits and keeps the other initial', () => {
    expect(getProfileInitials('!!! doe')).toBe('D');
    expect(getProfileInitials('john ???')).toBe('J');
  });

  it.each(['', ' '.repeat(3), '!!!', '!!! ???'])(
    'returns undefined when %j has no letters or digits',
    (name) => {
      expect(getProfileInitials(name)).toBeUndefined();
    },
  );
});
