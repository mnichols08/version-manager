#!/usr/bin/env node
'use strict';

/**
 * generate-readme-tasks.js
 *
 * Collects recent repository activity, stores it as context material, and asks a
 * local LM Studio instance (OpenAI compatible) to propose GitHub Copilot tasks
 * that describe README updates matching the latest changes.
 *
 * Usage:
 *   node scripts/generate-readme-tasks.js [--skip-llm] [--limit-commits N]
 *                                        [--model openai/gpt-oss-20b]
 *                                        [--base-url http://localhost:1234/v1]
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const http = require('http');
const https = require('https');

const root = path.join(__dirname, '..');

// ---------- CLI helpers ----------

function parseArgs(argv) {
  const result = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const fragment = argv[i];
    if (!fragment.startsWith('--')) {
      result._.push(fragment);
      continue;
    }

    const [flag, maybeValue] = fragment.split('=');
    const next = argv[i + 1];
    if (maybeValue !== undefined) {
      result[flag.slice(2)] = maybeValue;
      continue;
    }
    if (next && !next.startsWith('--')) {
      result[flag.slice(2)] = next;
      i += 1;
    } else {
      result[flag.slice(2)] = true;
    }
  }
  return result;
}

const args = parseArgs(process.argv.slice(2));

const options = {
  model: args.model || process.env.LM_STUDIO_MODEL || 'openai/gpt-oss-20b',
  baseUrl: args['base-url'] || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
  commitLimit: Number.parseInt(args['limit-commits'] || process.env.CONTEXT_COMMIT_LIMIT || '10', 10),
  skipLlm: Boolean(args['skip-llm'] || process.env.SKIP_LM_STUDIO)
};

// ---------- Git helpers ----------

function safeExec(command) {
  try {
    return execSync(command, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
  } catch (error) {
    return `Failed to run "${command}": ${error.message || error}`;
  }
}

function collectGitContext(commitLimit) {
  const branch = safeExec('git rev-parse --abbrev-ref HEAD');
  const remote = safeExec('git remote -v');
  const recentCommits = safeExec(`git log -n ${commitLimit} --pretty=format:%h;%ad;%s --date=short`);
  const status = safeExec('git status -sb');
  const stagedDiff = safeExec('git diff --staged --stat');
  const latestDiff = safeExec('git diff -U3 HEAD~1..HEAD');

  return {
    branch,
    remote,
    recentCommits,
    status,
    stagedDiff,
    latestDiff
  };
}

function findReadmeFiles() {
  const results = [];
  function walk(currentPath) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.git')) continue;
      const fullPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (/readme\.md$/i.test(entry.name)) {
        const contentPreview = fs.readFileSync(fullPath, 'utf8').slice(0, 5000);
        results.push({ path: path.relative(root, fullPath), preview: contentPreview });
      }
    }
  }
  walk(root);
  return results;
}

function formatContext({ gitContext, readmes }) {
  const lines = [];
  lines.push('# Repository Context');
  lines.push('');
  lines.push(`- Branch: ${gitContext.branch}`);
  lines.push('- Remote:');
  lines.push('```');
  lines.push(gitContext.remote);
  lines.push('```');
  lines.push('');
  lines.push('## Status');
  lines.push('```');
  lines.push(gitContext.status);
  lines.push('```');
  lines.push('');
  if (gitContext.stagedDiff) {
    lines.push('## Staged Diff Summary');
    lines.push('```');
    lines.push(gitContext.stagedDiff);
    lines.push('```');
    lines.push('');
  }
  if (gitContext.latestDiff) {
    lines.push('## Latest Commit Diff (HEAD~1..HEAD)');
    lines.push('```');
    lines.push(gitContext.latestDiff);
    lines.push('```');
    lines.push('');
  }
  lines.push('## Recent Commits');
  lines.push('```');
  lines.push(gitContext.recentCommits);
  lines.push('```');
  lines.push('');
  lines.push('## README Candidates');
  readmes.forEach((readme, index) => {
    lines.push(`### ${index + 1}. ${readme.path}`);
    lines.push('```md');
    lines.push(readme.preview);
    lines.push('```');
    lines.push('');
  });

  return lines.join('\n');
}

// ---------- LM Studio bridge ----------

function requestFactory(url) {
  if (url.protocol === 'https:') return https.request;
  if (url.protocol === 'http:') return http.request;
  throw new Error(`Unsupported protocol: ${url.protocol}`);
}

function callLmStudio(baseUrl, model, messages) {
  const resolvedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const endpoint = new URL('chat/completions', resolvedBase);
  const request = requestFactory(endpoint);

  const payload = JSON.stringify({
    model,
    temperature: 0.3,
    max_tokens: 1024,
    stream: false,
    messages
  });

  return new Promise((resolve, reject) => {
    const req = request(
      {
        method: 'POST',
        hostname: endpoint.hostname,
        port: endpoint.port,
        path: endpoint.pathname,
        protocol: endpoint.protocol,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`LM Studio responded with ${res.statusCode}: ${body}`));
            return;
          }
          try {
            const parsed = JSON.parse(body);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`Failed to parse LM Studio response: ${err.message || err}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ---------- Main flow ----------

function ensureTempDir() {
  const base = path.join(root, 'tmp', 'lm-studio-tasks');
  const folderName = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const dir = path.join(base, folderName);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeFileSyncSafe(filePath, contents) {
  fs.writeFileSync(filePath, contents, 'utf8');
  return filePath;
}

function buildSystemPrompt() {
  return [
    'You are a planning agent that designs concrete GitHub Copilot tasks.',
    'Read the repository context carefully and output a numbered JSON array of task objects.',
    'Each task must target README creation or updates that explain recent functionality or workflow changes.',
    'Emphasize clarity, limit each task to one cohesive objective, and include acceptance criteria.',
    'Prefer referencing specific files or sections when possible.'
  ].join(' ');
}

function buildUserPrompt(contextFilePath) {
  return [
    `Repository context stored at: ${contextFilePath}.`,
    'Summarize recent changes, note which README files exist or are missing,',
    'and generate 3-5 actionable tasks for GitHub Copilot that would produce useful README updates.',
    'Return JSON like:',
    '[',
    '  {',
    '    "id": "TASK-1",',
    '    "title": "Short title",',
    '    "summary": "One-sentence goal",',
    '    "acceptanceCriteria": ["list at least two"],',
    '    "artifacts": ["README.md#Section", "docs/new-feature.md"],',
    '    "priority": "high|medium|low"',
    '  }',
    ']',
    'If information is missing, note the gap in the summary field.'
  ].join(' ');
}

function summarizeLmResponse(response) {
  if (!response || !response.choices || !response.choices.length) return '';
  return response.choices[0]?.message?.content || '';
}

function stripCodeFence(text) {
  if (!text) return text;
  const trimmed = text.trim();
  const fencePattern = /^```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)\n?```$/;
  const match = trimmed.match(fencePattern);
  if (match) {
    return match[1].trim();
  }
  return trimmed;
}

async function main() {
  console.log('Collecting repository context...');
  const gitContext = collectGitContext(options.commitLimit);
  const readmes = findReadmeFiles();
  const combinedContext = formatContext({ gitContext, readmes });

  const tempDir = ensureTempDir();
  const contextPath = writeFileSyncSafe(path.join(tempDir, 'context.md'), combinedContext);

  const meta = {
    generatedAt: new Date().toISOString(),
    hostname: os.hostname(),
    options,
    contextFile: contextPath
  };
  writeFileSyncSafe(path.join(tempDir, 'meta.json'), JSON.stringify(meta, null, 2));

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(contextPath);
  writeFileSyncSafe(path.join(tempDir, 'prompt.txt'), `${systemPrompt}\n\n${userPrompt}`);

  let lmResponseContent = 'Skipped LM Studio call.';
  if (!options.skipLlm) {
    console.log('Querying LM Studio for task plan...');
    try {
      const rawResponse = await callLmStudio(options.baseUrl, options.model, [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `${userPrompt}\n\n---\n${combinedContext}` }
      ]);
      writeFileSyncSafe(path.join(tempDir, 'lm-response.json'), JSON.stringify(rawResponse, null, 2));
      lmResponseContent = summarizeLmResponse(rawResponse);
    } catch (err) {
      lmResponseContent = `Error contacting LM Studio: ${err.message || err}`;
      writeFileSyncSafe(path.join(tempDir, 'lm-error.log'), lmResponseContent);
      console.error(lmResponseContent);
    }
  }

  const tasksPath = path.join(tempDir, 'tasks.json');
  const cleanedContent = stripCodeFence(lmResponseContent);
  try {
    const parsed = JSON.parse(cleanedContent);
    writeFileSyncSafe(tasksPath, JSON.stringify(parsed, null, 2));
  } catch {
    writeFileSyncSafe(tasksPath, cleanedContent);
  }

  console.log('Context stored in:', tempDir);
  console.log('Task plan saved to tasks.json');
  if (options.skipLlm) {
    console.log('Note: LM Studio call was skipped. Run without --skip-llm to fetch tasks.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
