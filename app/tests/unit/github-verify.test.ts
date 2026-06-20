import { describe, it, expect } from 'vitest';
import { parseRepoUrl, verifyDeployment } from '../../src/lib/quest/github-verify/index.js';

describe('parseRepoUrl', () => {
  it('parses a valid public GitHub repo URL', () => {
    expect(parseRepoUrl('https://github.com/user/repo')).toEqual({ owner: 'user', repo: 'repo' });
    expect(parseRepoUrl('https://github.com/user/repo/')).toEqual({ owner: 'user', repo: 'repo' });
  });

  it('rejects non-GitHub hosts and malformed URLs', () => {
    expect(parseRepoUrl('https://gitlab.com/user/repo')).toBeNull();
    expect(parseRepoUrl('https://github.com/user')).toBeNull();
    expect(parseRepoUrl('not a url')).toBeNull();
  });
});

describe('verifyDeployment', () => {
  const taskIds = ['892', '757', '907'];

  const fetchOk = (body: string) =>
    (async (url: string) =>
      url.includes('/main/README.md')
        ? ({ ok: true, text: async () => body } as Response)
        : ({ ok: false, text: async () => '' } as Response));

  it('wins when the README contains all task ids', async () => {
    const res = await verifyDeployment({
      repoUrl: 'https://github.com/u/r',
      taskIds,
      fetchImpl: fetchOk('Solved tasks: 892, 757, 907'),
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.won).toBe(true);
  });

  it('returns BAD_URL for a malformed link', async () => {
    const res = await verifyDeployment({ repoUrl: 'nope', taskIds, fetchImpl: fetchOk('') });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('BAD_URL');
  });

  it('returns MISSING_IDS listing absent ids when the README is incomplete', async () => {
    const res = await verifyDeployment({
      repoUrl: 'https://github.com/u/r',
      taskIds,
      fetchImpl: fetchOk('Solved tasks: 892'),
    });
    expect(res.ok).toBe(false);
    if (!res.ok && res.code === 'MISSING_IDS') {
      expect(res.missing).toEqual(['757', '907']);
    } else {
      throw new Error('expected MISSING_IDS');
    }
  });

  it('returns UNREACHABLE when no README can be fetched', async () => {
    const fetchFail = (async () => ({ ok: false, text: async () => '' } as Response));
    const res = await verifyDeployment({ repoUrl: 'https://github.com/u/r', taskIds, fetchImpl: fetchFail });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('UNREACHABLE');
  });
});
