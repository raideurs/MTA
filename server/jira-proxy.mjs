// Dev-only backend proxy: centralizes Jira board data for the MTA back-office app.
// The Jira Personal Access Token stays server-side (never sent to the browser) —
// Jira's REST API has no CORS headers, so a direct browser call would be blocked anyway.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
    }
  }
  return env;
}

const env = loadEnv();
const JIRA_BASE_URL = env.JIRA_BASE_URL || 'https://jira.web.bpifrance.fr';
const JIRA_TOKEN = env.JIRA_TOKEN || '';
const PORT = Number(env.PORT || 4002);
const ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || 'http://localhost:4200';

if (!JIRA_TOKEN) {
  console.warn('⚠️  JIRA_TOKEN manquant dans server/.env — les appels Jira échoueront avec 401.');
}

async function jiraFetch(pathname) {
  const res = await fetch(`${JIRA_BASE_URL}${pathname}`, {
    headers: {
      Authorization: `Bearer ${JIRA_TOKEN}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Jira ${res.status} ${pathname} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function buildKanban(boardId) {
  const [config, issuesPage] = await Promise.all([
    jiraFetch(`/rest/agile/1.0/board/${boardId}/configuration`),
    jiraFetch(`/rest/agile/1.0/board/${boardId}/issue?maxResults=200&fields=summary,status,issuetype,priority,assignee`),
  ]);

  const columns = (config.columnConfig?.columns || []).map((col) => ({
    name: col.name,
    statuses: (col.statuses || []).map((s) => s.id),
    issues: [],
  }));

  for (const issue of issuesPage.issues || []) {
    const statusId = issue.fields?.status?.id;
    const column = columns.find((c) => c.statuses.includes(statusId));
    const card = {
      key: issue.key,
      summary: issue.fields?.summary || '',
      type: issue.fields?.issuetype?.name || '',
      priority: issue.fields?.priority?.name || '',
      assignee: issue.fields?.assignee?.displayName || null,
      status: issue.fields?.status?.name || '',
    };
    (column ? column.issues : columns[columns.length - 1]?.issues)?.push(card);
  }

  return {
    boardName: config.name,
    columns: columns.map(({ name, issues }) => ({ name, issues })),
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const match = req.url?.match(/^\/api\/jira\/kanban\/(\d+)$/);
  if (req.method === 'GET' && match) {
    try {
      const data = await buildKanban(match[1]);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      console.error('Jira proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'jira_fetch_failed', message: err.message }));
    }
    return;
  }

  res.writeHead(404).end();
});

server.listen(PORT, () => {
  console.log(`🔗 Jira proxy servi sur http://localhost:${PORT}  (base Jira: ${JIRA_BASE_URL})`);
});
