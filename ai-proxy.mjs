#!/usr/bin/env node
/* =====================================================================
   server/ai-proxy.mjs — OPTIONAL AI Cartographer proxy
   ---------------------------------------------------------------------
   - Serves the static app from ../files
   - POST /api/cartographer proxies narrative requests to an
     OpenAI-compatible provider using a SERVER-SIDE key.
   - No credential ever reaches the browser.
   - Without AI_API_KEY the endpoint returns 503 and the client falls
     back to the built-in deterministic templates.

   Usage:
     AI_API_KEY=sk-... AI_MODEL=gpt-4o-mini node server/ai-proxy.mjs
     PORT=8787 AI_BASE_URL=https://api.openai.com/v1 ...
   ===================================================================== */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', 'files');
const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.AI_API_KEY || '';
const BASE_URL = (process.env.AI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
const MAX_BODY = 64 * 1024;
const MAX_TEXT = 4000;
const MIN_TEXT = 40;
const RATE_LIMIT = 30;
const RATE_WINDOW = 60_000;

const KINDS = new Set(['intro', 'discovery', 'faction', 'companion', 'enemy', 'relic', 'mission', 'event', 'conclusion']);
const hits = new Map();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.md': 'text/markdown; charset=utf-8'
};

function sanitize(text) {
  return String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function validateNarrative(text) {
  if (typeof text !== 'string') return { ok: false, error: 'Narrative is not text.' };
  if (/<script|javascript:|onerror\s*=|onload\s*=/i.test(text)) return { ok: false, error: 'Unsafe markup.' };
  const clean = sanitize(text);
  if (clean.length < MIN_TEXT) return { ok: false, error: 'Narrative too short.' };
  if (clean.length > MAX_TEXT) return { ok: false, error: 'Narrative too long.' };
  return { ok: true, text: clean };
}

function rateLimited(ip) {
  const now = Date.now();
  const entry = hits.get(ip) || { count: 0, reset: now + RATE_WINDOW };
  if (now > entry.reset) { entry.count = 0; entry.reset = now + RATE_WINDOW; }
  entry.count += 1;
  hits.set(ip, entry);
  return entry.count > RATE_LIMIT;
}

function send(res, status, body, headers) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer'
  }, headers || {}));
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function handleNarrative(req, res) {
  const ip = req.socket.remoteAddress || 'unknown';
  if (rateLimited(ip)) return send(res, 429, { error: 'Rate limit exceeded. Try again shortly.' });

  if (!API_KEY) {
    return send(res, 503, { error: 'AI narrative is not configured on this server.' });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch (e) {
    return send(res, 400, { error: 'Invalid JSON request.' });
  }

  const kind = payload && payload.kind;
  const context = payload && payload.context;
  if (!KINDS.has(kind)) return send(res, 400, { error: 'Unknown narrative kind.' });
  if (!context || typeof context !== 'object') return send(res, 400, { error: 'Missing narrative context.' });
  if (JSON.stringify(context).length > 24_000) return send(res, 413, { error: 'Context too large.' });

  const system = [
    'You are the narrative voice of The Wayfinder\'s Archive, a post-apocalyptic cartographic survival archive.',
    'Write in restrained, atmospheric, literary prose. 120-190 words. No markdown, no HTML, no bullet lists, no headings.',
    'Use ONLY the supplied world data, factions, hazards, relics, missions and history.',
    'Never invent statistics, rewards, survival odds, item effects or combat outcomes.',
    'Never state that the player gained or lost resources, health, XP or equipment.',
    'Never address the reader as a player or mention game mechanics, prompts, AI, or models.',
    'The response is a single in-universe dispatch.'
  ].join(' ');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const upstream = await fetch(BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API_KEY
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.8,
        max_tokens: 380,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: 'Narrative kind: ' + kind + '\nContext JSON:\n' + JSON.stringify(context) }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timer);

    if (!upstream.ok) {
      return send(res, 502, { error: 'Narrative provider unavailable.' });
    }
    const data = await upstream.json();
    const raw = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const valid = validateNarrative(raw);
    if (!valid.ok) return send(res, 502, { error: 'Provider returned unusable narrative.' });
    return send(res, 200, { text: valid.text, provider: 'openai-compatible', model: MODEL });
  } catch (e) {
    clearTimeout(timer);
    return send(res, 502, { error: 'Narrative provider unavailable.' });
  }
}

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const target = path.resolve(ROOT, '.' + rel);
  if (!target.startsWith(ROOT)) return send(res, 403, { error: 'Forbidden' });
  fs.stat(target, (err, stat) => {
    if (err || !stat.isFile()) return send(res, 404, { error: 'Not found' });
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-store' : 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    });
    fs.createReadStream(target).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    return send(res, 204, '', {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
  }

  if (pathname === '/health') {
    return send(res, 200, {
      ok: true,
      service: 'wayfinder-ai-proxy',
      configured: !!API_KEY,
      provider: API_KEY ? 'openai-compatible' : 'none',
      model: MODEL
    }, { 'Access-Control-Allow-Origin': '*' });
  }

  if (pathname === '/api/cartographer' && req.method === 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return handleNarrative(req, res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed' });
  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log('[wayfinder] static app + AI proxy listening on http://localhost:' + PORT);
  console.log('[wayfinder] narrative provider: ' + (API_KEY ? MODEL + ' via ' + BASE_URL : 'DISABLED (offline templates active)'));
  console.log('[wayfinder] no browser-side credentials are used');
});
