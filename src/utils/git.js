const path = require('path');
const cp = require('child_process');

const root = path.resolve(__dirname, '..', '..');

const TYPE_ORDER = [
  { key: 'feat', label: 'Features' },
  { key: 'fix', label: 'Bug Fixes' },
  { key: 'perf', label: 'Performance Improvements' },
  { key: 'refactor', label: 'Refactors' },
  { key: 'docs', label: 'Documentation' },
  { key: 'test', label: 'Tests' },
  { key: 'build', label: 'Build System' },
  { key: 'ci', label: 'Continuous Integration' },
  { key: 'chore', label: 'Chores' },
  { key: 'style', label: 'Styling' },
  { key: 'other', label: 'Other Changes' }
];

const KNOWN_TYPES = new Set(TYPE_ORDER.map((entry) => entry.key));
const TYPE_PRIORITY = TYPE_ORDER.reduce((acc, entry, index) => {
  acc[entry.key] = index;
  return acc;
}, {});

function execGit(command, { allowError = false } = {}) {
  try {
    return cp.execSync(command, {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf8'
    });
  } catch (error) {
    if (allowError) {
      return '';
    }
    const stderr = error.stderr?.toString?.() || '';
    throw new Error(`Git command failed: ${command}\n${stderr || error.message}`);
  }
}

function ensureGitRepository() {
  execGit('git rev-parse --is-inside-work-tree');
}

function resolveRepoWebUrl() {
  const raw = execGit('git config --get remote.origin.url', { allowError: true }).trim();
  if (!raw) return null;

  if (raw.startsWith('git@')) {
    const [, hostAndPath] = raw.split('git@');
    if (!hostAndPath) return null;
    const [host, repoPath] = hostAndPath.split(':');
    if (!host || !repoPath) return null;
    return `https://${host}/${repoPath.replace(/\.git$/, '')}`;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw.replace(/\.git$/, '');
  }

  return null;
}

function parseConventionalMessage(subject = '', body = '') {
  const match = subject.match(/^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s*(?<description>.+)$/i);
  if (!match) {
    return {
      type: 'other',
      scope: null,
      description: subject.trim(),
      breaking: /BREAKING CHANGE/i.test(body)
    };
  }

  const type = match.groups.type.toLowerCase();
  const scope = match.groups.scope || null;
  const description = (match.groups.description || '').trim();
  const breaking = Boolean(match.groups.breaking) || /BREAKING CHANGE/i.test(body);

  return {
    type: KNOWN_TYPES.has(type) ? type : 'other',
    scope,
    description: description || subject.trim(),
    breaking
  };
}

function readCommitFiles(hash) {
  const output = execGit(`git diff-tree --no-commit-id --name-only -r ${hash}`, { allowError: true });
  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function formatList(items) {
  const filtered = items.filter(Boolean);
  if (filtered.length === 0) return '';
  if (filtered.length === 1) return filtered[0];
  if (filtered.length === 2) return `${filtered[0]} and ${filtered[1]}`;
  const head = filtered.slice(0, -1).join(', ');
  const tail = filtered[filtered.length - 1];
  return `${head}, and ${tail}`;
}

function collectCommits({ since, until = 'HEAD', limit, includeMerges = false } = {}) {
  ensureGitRepository();

  const repoUrl = resolveRepoWebUrl();
  const range = since ? `${since}..${until}` : until;
  const limitSegment = limit ? `-n ${limit}` : '';
  const mergeSegment = includeMerges ? '' : '--no-merges';
  const format = '%H%x1f%h%x1f%an%x1f%ad%x1f%s%x1f%b%x1e';
  const command = `git log ${range} ${mergeSegment} --date=short ${limitSegment} --pretty=format:${format}`;
  const raw = execGit(command, { allowError: true });

  if (!raw) {
    return { commits: [], repoUrl };
  }

  const records = raw.split('\x1e').filter(Boolean);
  const commits = records.map((record) => {
    const [hashRaw, shortHashRaw, authorRaw, dateRaw, rawSubject = '', rawBody = ''] = record.split('\x1f');
    const hash = (hashRaw || '').trim();
    const shortHash = (shortHashRaw || '').trim();
    const author = (authorRaw || '').trim();
    const date = (dateRaw || '').trim();
    const subject = rawSubject.trim();
    const body = rawBody.replace(/\r/g, '').trim();
    const details = parseConventionalMessage(subject, body);
    const bodyLines = body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !/^Co-authored-by:/i.test(line));
    const detailLine = bodyLines[0] && bodyLines[0] !== details.description ? bodyLines[0] : '';
    const files = readCommitFiles(hash);
    const filePreview = files.slice(0, 5);
    const references = Array.from(new Set(`${subject}\n${body}`.match(/#\d+/g) || []));

    return {
      hash,
      shortHash,
      author,
      date,
      subject,
      body,
      description: details.description,
      type: details.type,
      scope: details.scope,
      breaking: details.breaking,
      detail: detailLine,
      files,
      filePreview,
      references,
      affectsReadme: files.some((file) => /readme\.md$/i.test(file)),
      affectsDocs: files.some((file) => /^docs\//i.test(file)),
      affectsConfig: files.some((file) => /(package\.json|config\/)/i.test(file))
    };
  });

  commits.forEach((commit) => {
    commit.webUrl = repoUrl ? `${repoUrl}/commit/${commit.hash}` : null;
  });

  return { commits, repoUrl };
}

function groupCommitsByType(commits) {
  const groups = new Map();
  commits.forEach((commit) => {
    const type = KNOWN_TYPES.has(commit.type) ? commit.type : 'other';
    if (!groups.has(type)) {
      groups.set(type, []);
    }
    groups.get(type).push(commit);
  });

  return TYPE_ORDER.filter((entry) => groups.has(entry.key)).map((entry) => ({
    key: entry.key,
    label: entry.label,
    commits: groups.get(entry.key)
  }));
}

function buildSummaryInsights(commits) {
  if (!commits || commits.length === 0) {
    return [];
  }

  const counts = Object.fromEntries(TYPE_ORDER.map((entry) => [entry.key, 0]));
  const fileFrequency = new Map();
  const directoryFrequency = new Map();

  commits.forEach((commit) => {
    const typeKey = KNOWN_TYPES.has(commit.type) ? commit.type : 'other';
    counts[typeKey] += 1;

    commit.files.forEach((file) => {
  fileFrequency.set(file, (fileFrequency.get(file) || 0) + 1);
      const dir = path.posix.dirname(file);
      const dirKey = dir === '.' ? 'project root' : dir;
      directoryFrequency.set(dirKey, (directoryFrequency.get(dirKey) || 0) + 1);
    });
  });

  const parts = [];
  if (counts.feat) parts.push(`${counts.feat} feature${counts.feat === 1 ? '' : 's'}`);
  if (counts.fix) parts.push(`${counts.fix} bug fix${counts.fix === 1 ? '' : 'es'}`);
  if (counts.docs) parts.push(`${counts.docs} documentation update${counts.docs === 1 ? '' : 's'}`);
  if (counts.perf) parts.push(`${counts.perf} performance improvement${counts.perf === 1 ? '' : 's'}`);
  if (!parts.length) {
    parts.push(`${commits.length} maintenance change${commits.length === 1 ? '' : 's'}`);
  }

  const summary = [`This release includes ${formatList(parts)}.`];

  const topDirectories = Array.from(directoryFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([dir]) => (dir === 'project root' ? 'the project root' : `\`${dir}\``));

  if (topDirectories.length) {
    summary.push(`Primary focus areas: ${formatList(topDirectories)}.`);
  }

  const topFiles = Array.from(fileFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([file]) => `\`${file}\``);

  if (topFiles.length) {
    summary.push(`Key files touched: ${formatList(topFiles)}.`);
  }

  if (commits.some((commit) => commit.affectsReadme || commit.affectsDocs)) {
    summary.push('Documentation was refreshed to keep guides aligned with the latest behavior.');
  }

  const breakingCommits = commits.filter((commit) => commit.breaking);
  if (breakingCommits.length) {
    const titles = breakingCommits.map((commit) => commit.description);
    summary.push(`⚠️ Breaking changes: ${formatList(titles)}.`);
  }

  return summary;
}

function selectHighlights(commits, limit = 3) {
  if (!Array.isArray(commits) || commits.length === 0) {
    return [];
  }

  const priorityOf = (type) => (TYPE_PRIORITY[type] ?? TYPE_PRIORITY.other ?? TYPE_ORDER.length);

  return [...commits]
    .sort((a, b) => {
      if (a.breaking && !b.breaking) return -1;
      if (!a.breaking && b.breaking) return 1;
      const typeDiff = priorityOf(a.type) - priorityOf(b.type);
      if (typeDiff !== 0) return typeDiff;
      if (a.date === b.date) return a.shortHash.localeCompare(b.shortHash);
      return b.date.localeCompare(a.date);
    })
    .slice(0, limit);
}

function formatCommitLine(commit, { includeFiles = false, includeRefs = true, includeAuthor = false } = {}) {
  const parts = [];
  const prefix = commit.breaking ? '⚠️ ' : '';
  const scopeFragment = commit.scope ? ` (_${commit.scope}_)` : '';
  let line = `${prefix}${commit.description}${scopeFragment}`;

  if (commit.detail) {
    line += ` — ${commit.detail}`;
  }

  if (includeFiles && commit.filePreview.length) {
    const more = commit.files.length > commit.filePreview.length ? '…' : '';
    line += ` _(files: ${commit.filePreview.join(', ')}${more})_`;
  }

  if (includeRefs && commit.references.length) {
    line += ` (${commit.references.join(', ')})`;
  }

  if (commit.webUrl) {
    line += ` ([${commit.shortHash}](${commit.webUrl}))`;
  } else {
    line += ` (${commit.shortHash})`;
  }

  if (includeAuthor) {
    line += ` — ${commit.author}`;
  }

  parts.push(`- ${line}`);
  return parts.join(' ');
}

module.exports = {
  collectCommits,
  groupCommitsByType,
  buildSummaryInsights,
  selectHighlights,
  formatCommitLine,
  formatList
};
