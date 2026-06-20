/**
 * GitHub deployment verification (research R5): given a public repo URL, fetch the raw
 * README across main/master + README.md/readme.md and confirm the quest's task ids are
 * all present. No GitHub auth required. Pure over fetched text, so it is unit-testable
 * with an injected fetch.
 */

export interface RepoRef {
  owner: string;
  repo: string;
}

export type VerifyResult =
  | { ok: true; won: true }
  | { ok: false; code: 'BAD_URL'; message: string }
  | { ok: false; code: 'UNREACHABLE'; message: string }
  | { ok: false; code: 'MISSING_IDS'; missing: string[]; message: string };

type FetchLike = (url: string) => Promise<Pick<Response, 'ok' | 'text'>>;

const BRANCHES = ['main', 'master'];
const README_FILES = ['README.md', 'readme.md'];

/** Parse a public GitHub repo URL into { owner, repo }, or null if invalid. */
export function parseRepoUrl(input: string): RepoRef | null {
  let url: URL;
  try {
    url = new URL(input.trim().replace(/\/$/, ''));
  } catch {
    return null;
  }
  if (url.hostname !== 'github.com') return null;
  const parts = url.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return { owner: parts[0]!, repo: parts[1]! };
}

/** Fetch the raw README text, trying branch/file combinations; null if none reachable. */
export async function fetchReadme(ref: RepoRef, fetchImpl: FetchLike): Promise<string | null> {
  for (const branch of BRANCHES) {
    for (const file of README_FILES) {
      const rawUrl = `https://raw.githubusercontent.com/${ref.owner}/${ref.repo}/${branch}/${file}`;
      const res = await fetchImpl(rawUrl);
      if (res.ok) return res.text();
    }
  }
  return null;
}

/** Verify the deployment win condition: README must contain every quest task id (FR-014). */
export async function verifyDeployment(args: {
  repoUrl: string;
  taskIds: string[];
  fetchImpl?: FetchLike;
}): Promise<VerifyResult> {
  const fetchImpl = args.fetchImpl ?? ((url) => fetch(url));

  const ref = parseRepoUrl(args.repoUrl);
  if (!ref) {
    return {
      ok: false,
      code: 'BAD_URL',
      message: 'Provide a valid public GitHub repository link, e.g. https://github.com/user/repo.',
    };
  }

  const readme = await fetchReadme(ref, fetchImpl);
  if (readme === null) {
    return {
      ok: false,
      code: 'UNREACHABLE',
      message: 'Could not read the repository README. Ensure the repo is public and contains a README.',
    };
  }

  const missing = args.taskIds.filter((id) => !readme.includes(id));
  if (missing.length > 0) {
    return {
      ok: false,
      code: 'MISSING_IDS',
      missing,
      message: `Your README is missing these task ids: ${missing.join(', ')}.`,
    };
  }

  return { ok: true, won: true };
}
