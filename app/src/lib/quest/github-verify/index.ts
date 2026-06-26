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

/**
 * Original (ids-only) result shape. Returned by the backward-compatible `taskIds`-only call, so
 * existing callers (e.g. service.ts) keep their narrow `code` union and compile unchanged.
 */
export type VerifyResult =
  | { ok: true; won: true }
  | { ok: false; code: 'BAD_URL'; message: string }
  | { ok: false; code: 'UNREACHABLE'; message: string }
  | { ok: false; code: 'MISSING_IDS'; missing: string[]; message: string };

/** Failure shape added by US4 when required original-source links are missing. */
export interface MissingLinksResult {
  ok: false;
  code: 'MISSING_LINKS';
  missing: string[]; // carryover alias of missingTaskIds (callers that read `missing`)
  missingTaskIds: string[];
  missingLinks: string[];
  message: string;
}

/** Result of the link-aware call form: the ids-only outcomes plus the MISSING_LINKS failure. */
export type VerifyLinksResult = VerifyResult | MissingLinksResult;

/** Minimal coding-mission shape needed to require its original-source link in the README. */
export interface RequiredLinkMission {
  taskId: string;
  sourceUrl: string;
}

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

/** Extract the numeric ACMP `id_task` from a task source URL, or null if absent. */
export function acmpIdTask(sourceUrl: string): string | null {
  const m = /[?&]id_task=(\d+)/.exec(sourceUrl);
  return m ? m[1]! : null;
}

/**
 * Does the README contain a link to the given ACMP source URL? Matching is tolerant of
 * `http`↔`https` and an optional trailing slash, and is keyed on the exact `id_task=<n>`
 * so an unrelated ACMP link (different id_task) does NOT satisfy a required link.
 */
export function readmeHasSourceLink(readme: string, sourceUrl: string): boolean {
  const idTask = acmpIdTask(sourceUrl);
  if (idTask !== null) {
    // Require an acmp.ru link whose id_task is exactly this id (not a longer number),
    // tolerating an optional trailing slash. \b would not stop "892" matching "8921",
    // so assert the next char is not a digit.
    const re = new RegExp(`https?://acmp\\.ru/[^\\s)\\]]*?[?&]id_task=${idTask}(?!\\d)/?`, 'i');
    return re.test(readme);
  }
  // No id_task in the source URL: fall back to a normalized substring match.
  const norm = (s: string) => s.replace(/^http:/i, 'https:').replace(/\/+$/, '');
  return norm(readme).includes(norm(sourceUrl));
}

// Backward-compatible (ids-only) call form: keeps the narrow VerifyResult union so existing
// callers' `result.code` does not widen to include MISSING_LINKS.
export function verifyDeployment(args: {
  repoUrl: string;
  taskIds: string[];
  missions?: undefined;
  sourceUrls?: undefined;
  fetchImpl?: FetchLike;
}): Promise<VerifyResult>;
// US4 (link-aware) call form: when missions/sourceUrls are supplied, MISSING_LINKS may be returned.
export function verifyDeployment(args: {
  repoUrl: string;
  taskIds: string[];
  missions?: RequiredLinkMission[];
  sourceUrls?: string[];
  fetchImpl?: FetchLike;
}): Promise<VerifyLinksResult>;
/**
 * Verify the deployment win condition: README must contain every quest task id (FR-014) and,
 * when `missions`/`sourceUrls` are supplied, a link to each task's original ACMP page (FR-015/016).
 * The `taskIds`-only call form remains supported and behaves exactly as before.
 */
export async function verifyDeployment(args: {
  repoUrl: string;
  taskIds: string[];
  /** Optional: coding missions whose original-source links must appear in the README (US4). */
  missions?: RequiredLinkMission[];
  /** Optional alternative to `missions`: required ACMP source URLs. */
  sourceUrls?: string[];
  fetchImpl?: FetchLike;
}): Promise<VerifyLinksResult> {
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

  const requiredLinks = [
    ...(args.missions?.map((m) => m.sourceUrl) ?? []),
    ...(args.sourceUrls ?? []),
  ];

  // Backward-compatible path: no link requirement → ids-only check with the original result shape.
  if (requiredLinks.length === 0) {
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

  // US4 path: require all task ids AND all original-source links; report each specific miss.
  const missingTaskIds = args.taskIds.filter((id) => !readme.includes(id));
  const missingLinks = requiredLinks.filter((link) => !readmeHasSourceLink(readme, link));

  if (missingTaskIds.length > 0 || missingLinks.length > 0) {
    const parts: string[] = [];
    if (missingTaskIds.length > 0) parts.push(`task ids: ${missingTaskIds.join(', ')}`);
    if (missingLinks.length > 0) parts.push(`source links: ${missingLinks.join(', ')}`);
    return {
      ok: false,
      code: 'MISSING_LINKS',
      missing: missingTaskIds,
      missingTaskIds,
      missingLinks,
      message: `Your README is missing ${parts.join('; ')}.`,
    };
  }

  return { ok: true, won: true };
}
