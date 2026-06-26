import { describe, it, expect } from 'vitest';
import { verifyDeployment } from '../../src/lib/quest/github-verify/index.js';

/**
 * US4 / FR-015 / FR-016: the winning README must contain BOTH the quest's task ids AND a link to
 * each task's original ACMP page. This exercises the library's raw-README fetch path end to end
 * with an INJECTED fetch so it runs offline (no network, no fixtures). Quest tasks: 892, 757, 907.
 */
const missions = [
  { taskId: '892', sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=892' },
  { taskId: '757', sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=757' },
  { taskId: '907', sourceUrl: 'https://acmp.ru/index.asp?main=task&id_task=907' },
];

/** Serve the given body only on the main/README.md raw path, mimicking raw.githubusercontent.com. */
const serveReadme = (body: string) =>
  (async (url: string) =>
    url.includes('/main/README.md')
      ? ({ ok: true, text: async () => body } as Response)
      : ({ ok: false, text: async () => '' } as Response));

const fullReadme = [
  '# Mission Log',
  '',
  '## Solved tasks',
  '- [892](https://acmp.ru/index.asp?main=task&id_task=892)',
  '- [757](http://acmp.ru/index.asp?main=task&id_task=757/)',
  '- [907](https://acmp.ru/index.asp?main=task&id_task=907)',
].join('\n');

describe('README original-source link verification (integration, injected fetch)', () => {
  it('verifies when the README lists all ids AND all original source links', async () => {
    const res = await verifyDeployment({
      repoUrl: 'https://github.com/learner/quest-repo',
      taskIds: missions.map((m) => m.taskId),
      missions,
      fetchImpl: serveReadme(fullReadme),
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.won).toBe(true);
  });

  it('fails specifically when one original source link is missing', async () => {
    const readmeMissing907Link = [
      '# Mission Log',
      '- [892](https://acmp.ru/index.asp?main=task&id_task=892)',
      '- [757](https://acmp.ru/index.asp?main=task&id_task=757)',
      '- 907 (forgot the link)',
    ].join('\n');

    const res = await verifyDeployment({
      repoUrl: 'https://github.com/learner/quest-repo',
      taskIds: missions.map((m) => m.taskId),
      missions,
      fetchImpl: serveReadme(readmeMissing907Link),
    });

    expect(res.ok).toBe(false);
    if (!res.ok && res.code === 'MISSING_LINKS') {
      expect(res.missingLinks).toEqual(['https://acmp.ru/index.asp?main=task&id_task=907']);
      expect(res.missingTaskIds).toEqual([]);
    } else {
      throw new Error('expected MISSING_LINKS with the 907 source link');
    }
  });
});
