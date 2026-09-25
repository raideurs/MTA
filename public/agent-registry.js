/*!
 * <agent-registry> — Web Component (custom element) for the MTA Agent Registry.
 *
 * Self-contained, dependency-free, framework-agnostic. Ships as a single
 * classic script so it runs everywhere: a plain file:// page (no server),
 * Chainlit (inject a <script> tag) and Angular (add to `scripts[]`).
 *
 * Design language: Bpifrance "Propulsion" (https://design.prod.bel.cloud.bpifrance.fr).
 * The component consumes Propulsion design tokens (--pp-*) when the host page
 * provides them, and falls back to brand-equivalent values when standalone.
 *
 * Architecture (SOLID / DRY / KISS + GoF patterns):
 *   - Facade ............ the <agent-registry> custom element hides the subsystem.
 *   - Adapter / Port .... AgentRegistryClient port with Http + Mock adapters (DIP).
 *   - Decorator ......... CachingAgentRegistryClient wraps any client.
 *   - Factory ........... createClient() builds the right client graph.
 *   - Strategy .......... sort comparators, folder-normalization, data source.
 *   - Observer .......... createStore() notifies subscribers on state change.
 *   - State ............. view state machine: closed -> loading -> list -> detail.
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';
  var TAG_NAME = 'agent-registry';
  var EVENT_NS = 'agent-registry';

  // ============================================================================
  // 1. DOMAIN — value objects, mappers, presentation lookups (pure, testable)
  // ============================================================================

  /** Columns rendered by the agents table (criterion 3). Single source of truth. */
  var COLUMNS = [
    { key: 'id',             label: 'ID',          emoji: '🆔', type: 'string' },
    { key: 'agent_name',     label: 'Agent',       emoji: '🤖', type: 'string' },
    { key: 'domain',         label: 'Domaine',     emoji: '🏷️', type: 'string' },
    { key: 'description',    label: 'Description',  emoji: '📝', type: 'string' },
    { key: 'rag_enabled',    label: 'RAG',         emoji: '🧠', type: 'bool'   },
    { key: 'skills_enabled', label: 'Skills',      emoji: '🧩', type: 'bool'   }
  ];

  /**
   * Map a raw API agent (snake_case) to the internal summary shape.
   * Defensive: tolerates partial payloads without throwing (fail-soft at the UI).
   */
  function toAgentSummary(raw) {
    raw = raw || {};
    return {
      id: str(raw.id),
      agent_name: str(raw.agent_name),
      display_name: str(raw.display_name || raw.agent_name || raw.id),
      domain: str(raw.domain),
      description: str(raw.description),
      rag_enabled: !!raw.rag_enabled,
      skills_enabled: !!raw.skills_enabled,
      backend_url: str(raw.backend_url)
    };
  }

  function str(v) { return v == null ? '' : String(v); }

  /**
   * Presentation Strategy: pick an emoji for a registry object from its key.
   * Keeps the accordion titles scannable (criterion 6).
   */
  function objectEmoji(key) {
    var name = String(key || '').split('/').pop().toLowerCase();
    if (name === 'agents.md' || name === 'agent.md') return '🪪';
    if (name === 'skill.md') return '🧩';
    if (/\.ya?ml$/.test(name)) return '⚙️';
    if (/\.json$/.test(name)) return '🗂️';
    if (/\.md$/.test(name)) return '📄';
    if (/\.py$/.test(name)) return '🐍';
    if (/\.(txt|csv)$/.test(name)) return '🧾';
    return '📦';
  }

  /**
   * Folder-normalization Strategy used to correlate an agent with its objects.
   * The registry stores objects under a FOLDER whose name does not always equal
   * the agent id (e.g. id "AgentJarvis" lives in folder "jarvis"). The invariant
   * that always holds is: agent_name = "Agent<Name>" and folder = <name> lower.
   * We therefore strip an optional leading "agent" and non-alphanumerics.
   */
  function normalizeName(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/^agent/, '');
  }

  // ============================================================================
  // 2. ERRORS
  // ============================================================================

  function ApiError(status, message) {
    var err = new Error(message || ('HTTP ' + status));
    err.name = 'ApiError';
    err.status = status;
    return err;
  }

  // ============================================================================
  // 3. PORT + ADAPTERS (Dependency Inversion)
  //    Port surface: listAgents(), listObjectKeys(prefix), getObject(key)
  // ============================================================================

  /**
   * HTTP adapter over the agent-registry REST API.
   * The x-api-key is NEVER read from an attribute; it is supplied at runtime via
   * `apiKey` (set by the element after calling the host's apiKeyProvider on open,
   * criterion 9). It is only ever sent as a request header — never logged.
   */
  function HttpAgentRegistryClient(options) {
    options = options || {};
    this._baseUrl = stripTrailingSlash(options.baseUrl || '');
    // Bind the native fetch to its global: called as this._fetch(...) it would
    // otherwise lose its `this` and throw "Illegal invocation".
    this._fetch = options.fetchImpl ||
      (typeof global.fetch === 'function' ? global.fetch.bind(global) : null);
    this.apiKey = options.apiKey || '';
    if (!/^https?:\/\//i.test(this._baseUrl)) {
      throw new Error('HttpAgentRegistryClient: base-url must be an http(s) URL');
    }
    if (typeof this._fetch !== 'function') {
      throw new Error('HttpAgentRegistryClient: fetch is not available');
    }
  }
  HttpAgentRegistryClient.prototype.listAgents = function () {
    return this._get('/agents', false).then(function (rows) {
      return (Array.isArray(rows) ? rows : []).map(toAgentSummary);
    });
  };
  HttpAgentRegistryClient.prototype.listObjectKeys = function (prefix) {
    var q = prefix ? ('?prefix=' + encodeURIComponent(prefix)) : '';
    return this._get('/agents/objects' + q, false).then(function (keys) {
      return Array.isArray(keys) ? keys : [];
    });
  };
  HttpAgentRegistryClient.prototype.getObject = function (key) {
    // The route is /agents/objects/{key:path}: keep '/' but encode each segment.
    var encoded = String(key).split('/').map(encodeURIComponent).join('/');
    return this._get('/agents/objects/' + encoded, true);
  };
  /** GET /agents/{id}: manifest + identity (AGENT.md = system prompt) + skills. */
  HttpAgentRegistryClient.prototype.getAgentDetail = function (agentId) {
    return this._get('/agents/' + encodeURIComponent(agentId), false);
  };
  HttpAgentRegistryClient.prototype._get = function (path, raw) {
    var self = this;
    var headers = { Accept: raw ? 'text/plain' : 'application/json' };
    if (this.apiKey) headers['x-api-key'] = this.apiKey;
    return this._fetch(this._baseUrl + path, { method: 'GET', headers: headers })
      .then(function (res) {
        if (!res.ok) throw ApiError(res.status, 'GET ' + path + ' → ' + res.status);
        return raw ? res.text() : res.json();
      });
  };

  /**
   * In-memory adapter (fixtures) — enables the offline, server-less test page
   * (criterion 5) and deterministic unit tests. Same port surface as HTTP.
   */
  function MockAgentRegistryClient(options) {
    options = options || {};
    this._latency = options.latency == null ? 120 : options.latency;
    this._agents = (options.agents || DEFAULT_FIXTURES.agents).map(toAgentSummary);
    this._objects = options.objects || DEFAULT_FIXTURES.objects; // { key: content }
  }
  MockAgentRegistryClient.prototype.listAgents = function () {
    return this._delay(this._agents.slice());
  };
  MockAgentRegistryClient.prototype.listObjectKeys = function (prefix) {
    prefix = String(prefix || '');
    var keys = Object.keys(this._objects).filter(function (k) {
      return k.indexOf(prefix) === 0;
    }).sort();
    return this._delay(keys);
  };
  MockAgentRegistryClient.prototype.getObject = function (key) {
    var content = this._objects[key];
    if (content == null) return Promise.reject(ApiError(404, 'Not found: ' + key));
    return this._delay(content);
  };
  /** Mirrors the real /agents/{id}: identity (AGENT.md) + skills, derived from the same fixtures. */
  MockAgentRegistryClient.prototype.getAgentDetail = function (agentId) {
    var self = this;
    var found = this._agents.filter(function (a) { return a.id === agentId; })[0];
    if (!found) return Promise.reject(ApiError(404, 'Agent introuvable: ' + agentId));
    var folder = this._folderFor(found);
    var identityKey = folder ? folder + '/AGENT.md' : null;
    var identity = identityKey && this._objects[identityKey] != null ? this._objects[identityKey] : null;
    var skills = [];
    if (folder) {
      Object.keys(this._objects).sort().forEach(function (k) {
        if (k.indexOf(folder + '/skills/') === 0 && /\/SKILL\.md$/.test(k)) {
          skills.push({ name: k.split('/').slice(-2, -1)[0], content: self._objects[k] });
        }
      });
    }
    return this._delay(Object.assign({}, found, { manifest: found, identity: identity, skills: skills }));
  };
  /** Same folder-correlation strategy as AgentObjectResolver, kept local to avoid a circular dependency. */
  MockAgentRegistryClient.prototype._folderFor = function (agent) {
    var folders = {};
    Object.keys(this._objects).forEach(function (k) { folders[k.split('/')[0]] = true; });
    var candidates = [agent.id, agent.agent_name, agent.display_name];
    for (var i = 0; i < candidates.length; i++) {
      var target = normalizeName(candidates[i]);
      if (!target) continue;
      for (var folder in folders) {
        if (normalizeName(folder) === target) return folder;
      }
    }
    return null;
  };
  MockAgentRegistryClient.prototype._delay = function (value) {
    var ms = this._latency;
    return new Promise(function (resolve) {
      if (!ms) return resolve(value);
      global.setTimeout(function () { resolve(value); }, ms);
    });
  };

  /**
   * Decorator: transparent read-through cache over ANY client. Avoids refetching
   * the agent list and object contents while the popin stays open (performance).
   */
  function CachingAgentRegistryClient(inner) {
    this._inner = inner;
    this._agents = null;
    this._keys = Object.create(null);
    this._objects = Object.create(null);
    this._details = Object.create(null);
  }
  CachingAgentRegistryClient.prototype.listAgents = function () {
    var self = this;
    if (this._agents) return Promise.resolve(this._agents.slice());
    return this._inner.listAgents().then(function (a) { self._agents = a; return a.slice(); });
  };
  CachingAgentRegistryClient.prototype.listObjectKeys = function (prefix) {
    var self = this, k = prefix || '';
    if (this._keys[k]) return Promise.resolve(this._keys[k].slice());
    return this._inner.listObjectKeys(prefix).then(function (v) {
      self._keys[k] = v; return v.slice();
    });
  };
  CachingAgentRegistryClient.prototype.getObject = function (key) {
    var self = this;
    if (key in this._objects) return Promise.resolve(this._objects[key]);
    return this._inner.getObject(key).then(function (v) { self._objects[key] = v; return v; });
  };
  CachingAgentRegistryClient.prototype.getAgentDetail = function (agentId) {
    var self = this;
    if (agentId in this._details) return Promise.resolve(this._details[agentId]);
    return this._inner.getAgentDetail(agentId).then(function (v) { self._details[agentId] = v; return v; });
  };
  CachingAgentRegistryClient.prototype.setApiKey = function (key) {
    if (this._inner && 'apiKey' in this._inner) this._inner.apiKey = key;
  };

  // ============================================================================
  // 4. DOMAIN SERVICE — correlate an agent with its raw objects
  // ============================================================================

  /**
   * Resolves the folder that owns an agent's objects, then lists those objects.
   * Loads the full key set once and validates the match against real folders,
   * so correlation never blindly guesses a path that does not exist.
   */
  function AgentObjectResolver(client) {
    this._client = client;
    this._foldersPromise = null;
  }
  AgentObjectResolver.prototype._folders = function () {
    var self = this;
    if (!this._foldersPromise) {
      this._foldersPromise = this._client.listObjectKeys('').then(function (keys) {
        var set = Object.create(null);
        keys.forEach(function (k) {
          var top = String(k).split('/')[0];
          if (top) set[top] = true;
        });
        return Object.keys(set);
      });
    }
    return this._foldersPromise;
  };
  AgentObjectResolver.prototype.resolveFolder = function (agent) {
    return this._folders().then(function (folders) {
      var candidates = [agent.id, agent.agent_name, agent.display_name];
      for (var i = 0; i < candidates.length; i++) {
        var target = normalizeName(candidates[i]);
        if (!target) continue;
        for (var j = 0; j < folders.length; j++) {
          if (normalizeName(folders[j]) === target) return folders[j];
        }
      }
      // Last resort: an exact-id folder (covers agents whose id IS the folder).
      for (var k = 0; k < folders.length; k++) {
        if (folders[k] === agent.id) return folders[k];
      }
      return null;
    });
  };
  AgentObjectResolver.prototype.listObjectsForAgent = function (agent) {
    var self = this;
    return this.resolveFolder(agent).then(function (folder) {
      if (!folder) return [];
      return self._client.listObjectKeys(folder + '/');
    });
  };

  // ============================================================================
  // 5. SORTING — comparator Strategy factory (criterion 4)
  // ============================================================================

  function createComparator(key, direction, type) {
    var dir = direction === 'desc' ? -1 : 1;
    return function (a, b) {
      var va = a[key], vb = b[key];
      var cmp;
      if (type === 'bool') {
        cmp = (va === vb) ? 0 : (va ? 1 : -1);
      } else {
        cmp = String(va).localeCompare(String(vb), 'fr', { sensitivity: 'base', numeric: true });
      }
      return cmp * dir;
    };
  }

  // ============================================================================
  // 6. STATE — tiny Observer store + view state machine
  // ============================================================================

  function createStore(initial) {
    var state = Object.assign({}, initial);
    var listeners = [];
    return {
      get: function () { return state; },
      set: function (patch, silent) {
        state = Object.assign({}, state, patch);
        if (silent) return;
        for (var i = 0; i < listeners.length; i++) listeners[i](state);
      },
      subscribe: function (fn) {
        listeners.push(fn);
        return function () { listeners = listeners.filter(function (l) { return l !== fn; }); };
      }
    };
  }

  // ============================================================================
  // 7. FACTORY — build the client graph from configuration
  // ============================================================================

  function createClient(config) {
    config = config || {};
    var base;
    if (config.client) {
      base = config.client;                              // host-injected (DIP escape hatch)
    } else if (config.mock || !config.baseUrl) {
      base = new MockAgentRegistryClient(config.mockOptions); // offline / no-server
    } else {
      base = new HttpAgentRegistryClient({
        baseUrl: config.baseUrl,
        apiKey: config.apiKey,
        fetchImpl: config.fetchImpl
      });
    }
    return new CachingAgentRegistryClient(base);
  }

  // ============================================================================
  // 8. VIEW — safe DOM builders (hyperscript) + icons
  // ============================================================================

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Minimal, dependency-free Markdown → safe HTML (headings, lists, bold,
   * italic, inline code, paragraphs). All text runs through escapeHtml
   * BEFORE the markdown regexes run, so raw HTML in the source can never
   * reach innerHTML (only the tags this function itself inserts do).
   * Used to render AGENT.md / SKILL.md prompt content in a readable way
   * instead of a raw preformatted block.
   */
  function renderMarkdownLite(text) {
    var root = document.createElement('div');
    root.className = 'md';
    var body = String(text == null ? '' : text).replace(/\r\n/g, '\n');

    // An optional YAML front-matter block (--- ... ---) is metadata, not prose.
    var fm = body.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
    if (fm) {
      root.appendChild(renderFrontMatter(fm[1]));
      body = body.slice(fm[0].length);
    }

    function inline(raw) {
      var s = escapeHtml(raw);
      s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
      s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
      return s;
    }

    var lines = body.split('\n');
    var listEl = null;
    var paraBuf = [];
    function flushPara() {
      if (!paraBuf.length) return;
      var p = document.createElement('p');
      p.innerHTML = paraBuf.join('<br>');
      root.appendChild(p);
      paraBuf = [];
    }
    lines.forEach(function (line) {
      var heading = line.match(/^(#{1,4})\s+(.*)$/);
      if (heading) {
        flushPara(); listEl = null;
        var el = document.createElement('h' + Math.min(heading[1].length + 1, 6));
        el.innerHTML = inline(heading[2].trim());
        root.appendChild(el);
        return;
      }
      var item = line.match(/^\s*[-*]\s+(.*)$/);
      if (item) {
        flushPara();
        if (!listEl) { listEl = document.createElement('ul'); root.appendChild(listEl); }
        var li = document.createElement('li');
        li.innerHTML = inline(item[1]);
        listEl.appendChild(li);
        return;
      }
      listEl = null;
      if (!line.trim()) { flushPara(); return; }
      paraBuf.push(inline(line));
    });
    flushPara();
    return root;
  }

  /** Renders a YAML front-matter block as a small, distinct metadata panel. */
  function renderFrontMatter(yamlText) {
    var wrap = document.createElement('div');
    wrap.className = 'md-frontmatter';
    wrap.appendChild(h('div', { class: 'md-frontmatter-label' }, 'Métadonnées'));
    wrap.appendChild(h('pre', {}, yamlText.trim()));
    return wrap;
  }

  /** Minimal hyperscript. Text children are set via textContent → XSS-safe. */
  function h(tag, attrs) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (name) {
      var v = attrs[name];
      if (v == null || v === false) return;
      if (name === 'class') node.className = v;
      else if (name === 'text') node.textContent = v;
      else if (name === 'html') node.innerHTML = v; // only for trusted, internal SVG
      else if (name.indexOf('on') === 0 && typeof v === 'function') {
        node.addEventListener(name.slice(2).toLowerCase(), v);
      } else if (name === 'dataset') {
        Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      } else node.setAttribute(name, v);
    });
    for (var i = 2; i < arguments.length; i++) {
      var child = arguments[i];
      if (child == null) continue;
      if (Array.isArray(child)) child.forEach(function (c) { if (c != null) node.appendChild(c); });
      else if (typeof child === 'string') node.appendChild(document.createTextNode(child));
      else node.appendChild(child);
    }
    return node;
  }

  /** DRY helpers used across the view layer. */
  var _uidSeq = 0;
  function uid(prefix) { return (prefix || 'arw') + '-' + (++_uidSeq) + '-' + Math.random().toString(36).slice(2, 7); }
  function iconSpan(svg, cls) { return h('span', { class: cls || 'ico', html: svg }); }

  /** Multi-agent / AI icon (criterion 1) — inline SVG, themeable via currentColor. */
  var ICON_AGENT =
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" ' +
    'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
    'stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<rect x="8" y="9.5" width="8" height="6.5" rx="2"/>' +
    '<path d="M12 9.5V7"/><circle cx="12" cy="5.6" r="1.4"/>' +
    '<path d="M8 12.5H6.2M17.8 12.5H16"/>' +
    '<circle cx="10.3" cy="12.6" r="0.9" fill="currentColor" stroke="none"/>' +
    '<circle cx="13.7" cy="12.6" r="0.9" fill="currentColor" stroke="none"/>' +
    '<circle cx="4.4" cy="12.5" r="1.7"/><circle cx="19.6" cy="12.5" r="1.7"/>' +
    '<circle cx="7" cy="19.4" r="1.7"/><circle cx="17" cy="19.4" r="1.7"/>' +
    '<path d="M9 16l-1.4 2M15 16l1.4 2"/></svg>';

  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var ICON_BACK =
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M15 18l-6-6 6-6"/></svg>';

  var ICON_CHEVRON =
    '<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 9l6 6 6-6"/></svg>';

  // ============================================================================
  // 9. STYLES — Propulsion tokens (--pp-*) with brand-equivalent fallbacks
  // ============================================================================

  var STYLES = [
    ':host{',
    '  --arw-primary: var(--pp-color-primary, #ffd200);',
    '  --arw-primary-ink: var(--pp-color-on-primary, #1a1a18);',
    '  --arw-ink: var(--pp-neutral-high, #1a1a18);',
    '  --arw-ink-soft: var(--pp-neutral-medium, #5a5a55);',
    '  --arw-surface: var(--pp-neutral-background, #ffffff);',
    '  --arw-surface-alt: var(--pp-neutral-low, #f4f4f2);',
    '  --arw-border: var(--pp-neutral-border, #d9d9d4);',
    '  --arw-danger: var(--pp-color-error, #c0392b);',
    '  --arw-radius: var(--pp-radius-01, 10px);',
    '  --arw-shadow: 0 10px 40px rgba(0,0,0,.18);',
    '  --arw-font: var(--pp-font-family, "Marianne", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);',
    '  font-family: var(--arw-font); color: var(--arw-ink); box-sizing: border-box;',
    '}',
    '*,*::before,*::after{box-sizing:border-box;}',

    /* Launcher (the closed popin, criterion 2) */
    '.launcher{position:var(--arw-launcher-position, fixed);right:var(--arw-launcher-right, 24px);bottom:var(--arw-launcher-bottom, 24px);display:inline-flex;align-items:center;',
    '  gap:10px;height:52px;padding:0 18px 0 14px;border:none;border-radius:999px;cursor:pointer;',
    '  background:var(--arw-primary);color:var(--arw-primary-ink);font:600 15px/1 var(--arw-font);',
    '  box-shadow:var(--arw-shadow);transition:transform .15s ease, box-shadow .15s ease;z-index:2147483000;}',
    '.launcher:hover{transform:translateY(-2px);box-shadow:0 14px 46px rgba(0,0,0,.24);}',
    '.launcher:focus-visible{outline:3px solid #0a67ff;outline-offset:2px;}',
    '.launcher .ico{width:26px;height:26px;display:block;}',

    /* Overlay + dialog (Propulsion Modal) */
    '.overlay{position:fixed;inset:0;background:rgba(20,20,18,.55);display:flex;align-items:center;',
    '  justify-content:center;padding:24px;z-index:2147483001;}',
    '.dialog{background:var(--arw-surface);width:min(1040px,96vw);max-height:92vh;display:flex;',
    '  flex-direction:column;border-radius:calc(var(--arw-radius) + 4px);box-shadow:var(--arw-shadow);',
    '  overflow:hidden;animation:arw-pop .18s ease;}',
    '@keyframes arw-pop{from{opacity:0;transform:translateY(8px) scale(.98);}to{opacity:1;}}',

    /* Header (criterion 7 + 10) */
    '.header{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--arw-border);',
    '  background:linear-gradient(180deg,var(--arw-surface),var(--arw-surface-alt));}',
    '.logo{width:40px;height:40px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;',
    '  border-radius:10px;background:var(--arw-primary);color:var(--arw-primary-ink);}',
    '.logo .ico{width:26px;height:26px;}',
    '.titles{display:flex;flex-direction:column;line-height:1.2;min-width:0;}',
    '.title{font-size:18px;font-weight:700;letter-spacing:.01em;}',
    '.subtitle{font-size:12.5px;color:var(--arw-ink-soft);}',
    '.spacer{flex:1 1 auto;}',
    '.icon-btn{width:38px;height:38px;border:1px solid var(--arw-border);background:var(--arw-surface);',
    '  border-radius:10px;cursor:pointer;color:var(--arw-ink);display:inline-flex;align-items:center;',
    '  justify-content:center;padding:8px;transition:background .12s ease;}',
    '.icon-btn:hover{background:var(--arw-surface-alt);}',
    '.icon-btn:focus-visible{outline:3px solid #0a67ff;outline-offset:2px;}',

    /* Body */
    '.body{padding:0;overflow:auto;flex:1 1 auto;}',
    '.pad{padding:18px 20px;}',
    '.toolbar{display:flex;align-items:center;gap:10px;padding:12px 20px;border-bottom:1px solid var(--arw-border);}',
    '.back{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--arw-border);background:var(--arw-surface);',
    '  padding:7px 12px;border-radius:8px;cursor:pointer;font:600 13px var(--arw-font);color:var(--arw-ink);}',
    '.back:hover{background:var(--arw-surface-alt);} .back .ico{width:16px;height:16px;}',
    '.crumb{font-size:13px;color:var(--arw-ink-soft);} .crumb b{color:var(--arw-ink);}',

    /* Table (Propulsion Table, sortable) */
    'table{width:100%;border-collapse:separate;border-spacing:0;font-size:13.5px;}',
    'thead th{position:sticky;top:0;background:var(--arw-surface-alt);text-align:left;',
    '  padding:11px 14px;border-bottom:2px solid var(--arw-border);white-space:nowrap;z-index:1;}',
    'th.sortable{cursor:pointer;user-select:none;} th.sortable:hover{color:#000;background:#ececd8;}',
    'th .th-in{display:inline-flex;align-items:center;gap:6px;}',
    'th .arrow{opacity:.35;font-size:11px;} th[aria-sort="ascending"] .arrow,',
    'th[aria-sort="descending"] .arrow{opacity:1;}',
    'th:focus-visible{outline:3px solid #0a67ff;outline-offset:-3px;}',
    'tbody td{padding:11px 14px;border-bottom:1px solid var(--arw-border);vertical-align:top;}',
    'tbody tr{cursor:pointer;transition:background .1s ease;}',
    'tbody tr:hover{background:var(--arw-surface-alt);}',
    'tbody tr:focus-visible{outline:3px solid #0a67ff;outline-offset:-3px;}',
    '.cell-id{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;color:var(--arw-ink-soft);}',
    '.cell-name{font-weight:600;}',
    '.desc{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:360px;color:var(--arw-ink-soft);}',
    '.check{width:18px;height:18px;accent-color:var(--arw-primary);pointer-events:none;}',
    '.bool{display:inline-flex;align-items:center;gap:7px;}',

    /* Accordion (Propulsion Accordion, criterion 6) */
    '.acc{border:1px solid var(--arw-border);border-radius:10px;margin:0 0 10px;overflow:hidden;background:var(--arw-surface);}',
    '.acc-head{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border:none;',
    '  background:var(--arw-surface);cursor:pointer;font:600 14px var(--arw-font);color:var(--arw-ink);text-align:left;}',
    '.acc-head:hover{background:var(--arw-surface-alt);}',
    '.acc-head:focus-visible{outline:3px solid #0a67ff;outline-offset:-3px;}',
    '.acc-emoji{font-size:16px;} .acc-key{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}',
    '.acc-chevron{width:18px;height:18px;transition:transform .18s ease;color:var(--arw-ink-soft);}',
    '.acc[open] .acc-chevron{transform:rotate(180deg);}',
    '.acc-panel{border-top:1px solid var(--arw-border);}',
    '.acc-panel pre{margin:0;padding:14px;max-height:340px;overflow:auto;background:#1e1e1c;color:#f2f2ee;',
    '  font:12.5px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;}',

    /* Prompt système & Skills (mis en avant, non repliés — criterion "prompt système") */
    '.prompt-panel,.skill-block{border:1px solid var(--arw-border);border-radius:10px;margin:0 0 14px;overflow:hidden;background:var(--arw-surface);}',
    '.prompt-head,.skill-name,.skills-head{padding:10px 14px;font:700 13px var(--arw-font);color:var(--arw-ink);',
    '  background:var(--arw-surface-alt);border-bottom:1px solid var(--arw-border);}',
    '.skills-head{border-radius:10px 10px 0 0;border-bottom:none;margin:0;}',
    '.skills-panel{border:1px solid var(--arw-border);border-radius:10px;margin:0 0 16px;overflow:hidden;}',
    '.skills-panel .skill-block{border:none;border-radius:0;margin:0;border-top:1px solid var(--arw-border);}',
    '.prompt-body,.skill-body{margin:0;padding:4px 18px 12px;max-height:420px;overflow:auto;',
    '  background:var(--arw-surface);color:var(--arw-ink);font:13.5px/1.6 var(--arw-font);}',

    /* Markdown rendering (headings, lists, bold/italic/inline code, front-matter) */
    '.md h2,.md h3,.md h4,.md h5{margin:14px 0 6px;line-height:1.3;color:var(--arw-ink);}',
    '.md h2:first-child,.md h3:first-child,.md h4:first-child,.md h5:first-child{margin-top:12px;}',
    '.md h2{font-size:16px;font-weight:700;border-bottom:1px solid var(--arw-border);padding-bottom:4px;}',
    '.md h3{font-size:14.5px;font-weight:700;} .md h4,.md h5{font-size:13.5px;font-weight:700;}',
    '.md p{margin:0 0 10px;} .md ul{margin:0 0 10px;padding-left:22px;} .md li{margin:0 0 4px;}',
    '.md strong{font-weight:700;} .md em{font-style:italic;}',
    '.md code{background:var(--arw-surface-alt);border:1px solid var(--arw-border);border-radius:4px;',
    '  padding:1px 5px;font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;}',
    '.md-frontmatter{margin:0 -18px 10px;padding:10px 18px 12px;background:var(--arw-surface-alt);',
    '  border-bottom:1px solid var(--arw-border);}',
    '.md-frontmatter-label{font:700 11px var(--arw-font);letter-spacing:.04em;text-transform:uppercase;',
    '  color:var(--arw-ink-soft);margin:0 0 6px;}',
    '.md-frontmatter pre{margin:0;max-height:140px;overflow:auto;background:transparent;color:var(--arw-ink-soft);',
    '  font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;white-space:pre-wrap;word-break:break-word;}',

    /* States */
    '.state{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;',
    '  padding:56px 20px;color:var(--arw-ink-soft);text-align:center;}',
    '.spinner{width:34px;height:34px;border:3px solid var(--arw-border);border-top-color:var(--arw-primary);',
    '  border-radius:50%;animation:arw-spin .8s linear infinite;}',
    '@keyframes arw-spin{to{transform:rotate(360deg);}}',
    '@media (prefers-reduced-motion: reduce){*{animation:none !important;transition:none !important;}}',
    '.error{color:var(--arw-danger);} .retry{border:1px solid var(--arw-border);background:var(--arw-surface);',
    '  padding:8px 16px;border-radius:8px;cursor:pointer;font:600 13px var(--arw-font);color:var(--arw-ink);}',
    '.tag{display:inline-block;padding:2px 8px;border-radius:999px;background:var(--arw-surface-alt);',
    '  border:1px solid var(--arw-border);font-size:11.5px;color:var(--arw-ink-soft);}',
    '.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}',
    '@media (max-width:640px){.desc{max-width:160px;} .launcher span{display:none;} .launcher{padding:0;width:52px;justify-content:center;}}'
  ].join('\n');

  // ============================================================================
  // 10. WEB COMPONENT — Facade over the whole subsystem
  // ============================================================================

  function AgentRegistryElement() {
    var self = Reflect.construct(HTMLElement, [], AgentRegistryElement);
    self._store = createStore({
      open: false, view: 'idle', agents: [],
      sortKey: null, sortDir: 'asc',
      selectedAgent: null, error: null
    });
    self._client = null;
    self._resolver = null;
    self._lastFocus = null;
    self._gen = 0; // generation token: guards against stale async responses (races)
    /** @type {null|function():(string|Promise<string>)} host-supplied key provider */
    self.apiKeyProvider = null;
    self.client = null; // optional host-injected client (DIP)
    return self;
  }
  AgentRegistryElement.prototype = Object.create(
    typeof HTMLElement !== 'undefined' ? HTMLElement.prototype : Object.prototype
  );
  AgentRegistryElement.prototype.constructor = AgentRegistryElement;

  Object.defineProperty(AgentRegistryElement, 'observedAttributes', {
    get: function () { return ['open', 'base-url', 'mock', 'heading']; }
  });

  AgentRegistryElement.prototype.connectedCallback = function () {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._renderShell();
    this._store.subscribe(this._onState.bind(this));
    this._onState(this._store.get());
    if (this.hasAttribute('open')) this.open();
  };

  AgentRegistryElement.prototype.attributeChangedCallback = function (name, oldV, newV) {
    if (name === 'open') {
      var wantOpen = newV !== null;
      if (wantOpen && !this._store.get().open) this.open();
      else if (!wantOpen && this._store.get().open) this.close();
    } else if (name === 'heading') {
      this._syncHeading();
    }
  };

  // ---- public API ----------------------------------------------------------

  AgentRegistryElement.prototype.open = function () {
    if (this._store.get().open) return Promise.resolve();
    this._lastFocus = this.getRootNode().activeElement || document.activeElement;
    // Update state BEFORE reflecting the attribute so the reflected
    // attributeChangedCallback does not re-enter open().
    this._store.set({ open: true, view: 'loading', error: null });
    if (!this.hasAttribute('open')) this.setAttribute('open', '');
    this._emit('open');
    return this._bootstrapAndLoad();
  };

  AgentRegistryElement.prototype.close = function () {
    if (!this._store.get().open) return;
    this._gen++; // invalidate any in-flight request
    this._store.set({ open: false, view: 'idle', selectedAgent: null });
    if (this.hasAttribute('open')) this.removeAttribute('open');
    this._emit('close');
    if (this._lastFocus && this._lastFocus.focus) { try { this._lastFocus.focus(); } catch (e) {} }
  };

  AgentRegistryElement.prototype.toggle = function () {
    return this._store.get().open ? this.close() : this.open();
  };

  AgentRegistryElement.prototype.reload = function () {
    return this._bootstrapAndLoad();
  };

  // ---- data flow -----------------------------------------------------------

  /** Build a fresh client graph from the CURRENT configuration (single source of truth). */
  AgentRegistryElement.prototype._buildClient = function (apiKey) {
    var baseUrl = this.getAttribute('base-url') || '';
    var mock = this.hasAttribute('mock') || (!baseUrl && !this.client);
    this._client = createClient({
      client: this.client || null,
      baseUrl: baseUrl, mock: mock, apiKey: apiKey || ''
    });
    this._resolver = new AgentObjectResolver(this._client);
    return this._client;
  };

  /** Resolve the api key via the host callback (criterion 9), build client, load agents. */
  AgentRegistryElement.prototype._bootstrapAndLoad = function () {
    var self = this;
    var gen = ++this._gen;
    return Promise.resolve()
      .then(function () {
        return typeof self.apiKeyProvider === 'function' ? self.apiKeyProvider() : null;
      })
      .then(function (apiKey) {
        // Always rebuild so a source/base-url/mock change between opens is honored.
        return self._buildClient(apiKey).listAgents();
      })
      .then(function (agents) {
        if (gen !== self._gen) return; // stale: superseded or closed
        var s = self._store.get();
        var sorted = self._sorted(agents, s.sortKey, s.sortDir);
        self._store.set({ agents: sorted, view: 'list', error: null });
      })
      .catch(function (err) {
        if (gen !== self._gen) return;
        self._store.set({ view: 'error', error: humanizeError(err) });
        self._emit('error', { error: err });
      });
  };

  AgentRegistryElement.prototype._selectAgent = function (agent) {
    var self = this;
    var gen = ++this._gen;
    this._store.set({ selectedAgent: agent, view: 'detail-loading', agentDetail: null });
    this._emit('agent-selected', { agent: agent });
    Promise.all([
      this._resolver.listObjectsForAgent(agent),
      // The system prompt is a bonus display: never blocks the raw objects view.
      this._client.getAgentDetail(agent.id).catch(function () { return null; })
    ])
      .then(function (results) {
        if (gen !== self._gen) return;
        self._store.set({ view: 'detail', objectKeys: results[0], agentDetail: results[1] });
      })
      .catch(function (err) {
        if (gen !== self._gen) return;
        self._store.set({ view: 'detail-error', error: humanizeError(err) });
        self._emit('error', { error: err });
      });
  };

  AgentRegistryElement.prototype._sorted = function (agents, key, dir) {
    if (!key) return agents.slice();
    var col = COLUMNS.filter(function (c) { return c.key === key; })[0];
    return agents.slice().sort(createComparator(key, dir, col ? col.type : 'string'));
  };

  AgentRegistryElement.prototype._toggleSort = function (key) {
    var s = this._store.get();
    var dir = (s.sortKey === key && s.sortDir === 'asc') ? 'desc' : 'asc';
    var agents = this._sorted(s.agents, key, dir);
    // Silent update + targeted DOM refresh: keeps keyboard focus on the header
    // and avoids rebuilding thead (perf + a11y) instead of a full body re-render.
    this._store.set({ sortKey: key, sortDir: dir, agents: agents }, true);
    this._syncSortIndicators();
    this._renderRows();
  };

  // ---- rendering -----------------------------------------------------------

  AgentRegistryElement.prototype._renderShell = function () {
    var root = this.shadowRoot;
    root.innerHTML = '';
    root.appendChild(h('style', { html: STYLES }));

    this._launcher = h('button', {
      class: 'launcher', type: 'button',
      'aria-haspopup': 'dialog', 'aria-expanded': 'false',
      'aria-label': 'Ouvrir agent-registry',
      onClick: this.open.bind(this)
    }, iconSpan(ICON_AGENT), h('span', {}, TAG_NAME));

    this._mount = h('div'); // overlay/dialog mounts here when open
    root.appendChild(this._launcher);
    root.appendChild(this._mount);
  };

  AgentRegistryElement.prototype._onState = function (state) {
    if (!this._launcher) return;
    this._launcher.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    this._launcher.style.display = state.open ? 'none' : '';
    if (!state.open) {
      // Hide (don't destroy) the dialog: keeps `this._dialog` valid so the
      // next open() re-shows it instead of silently failing to remount.
      if (this._overlay) this._overlay.style.display = 'none';
      return;
    }
    if (!this._dialog) this._mountDialog();
    else { this._overlay.style.display = ''; this._focusFirst(); }
    this._renderBody(state);
  };

  AgentRegistryElement.prototype._mountDialog = function () {
    var self = this;
    var titleId = uid('arw-title');

    this._heading = h('div', { class: 'title', id: titleId }, this._headingText());
    var header = h('div', { class: 'header' },
      h('div', { class: 'logo' }, iconSpan(ICON_AGENT)),
      h('div', { class: 'titles' },
        this._heading,
        h('div', { class: 'subtitle' }, 'Catalogue des agents métiers MTA')),
      h('div', { class: 'spacer' }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Fermer',
        onClick: this.close.bind(this) }, iconSpan(ICON_CLOSE))
    );

    this._bodyEl = h('div', { class: 'body', 'aria-live': 'polite' });
    this._dialog = h('div', {
      class: 'dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId
    }, header, this._bodyEl);

    this._overlay = h('div', {
      class: 'overlay',
      onClick: function (e) { if (e.target === self._overlay) self.close(); }
    }, this._dialog);

    this._overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.stopPropagation(); self.close(); }
      else if (e.key === 'Tab') self._trapFocus(e);
    });

    this._mount.appendChild(this._overlay);
    this._focusFirst();
  };

  AgentRegistryElement.prototype._renderBody = function (state) {
    if (!this._bodyEl) return;
    var body = this._bodyEl;
    var busy = state.view === 'loading' || state.view === 'detail-loading';
    body.setAttribute('aria-busy', busy ? 'true' : 'false');
    body.innerHTML = '';
    switch (state.view) {
      case 'loading':        body.appendChild(this._viewLoading('Chargement des agents…')); break;
      case 'error':          body.appendChild(this._viewError(state.error, this.reload.bind(this))); break;
      case 'list':           body.appendChild(this._viewList(state)); break;
      case 'detail-loading': body.appendChild(this._viewDetailShell(state, this._viewLoading('Chargement des objets…'))); break;
      case 'detail-error':   body.appendChild(this._viewDetailShell(state, this._viewError(state.error, this._retryDetail.bind(this)))); break;
      case 'detail':         body.appendChild(this._viewDetail(state)); break;
      default:               body.appendChild(this._viewLoading('…'));
    }
  };

  AgentRegistryElement.prototype._retryDetail = function () {
    if (this._store.get().selectedAgent) this._selectAgent(this._store.get().selectedAgent);
  };

  AgentRegistryElement.prototype._viewLoading = function (label) {
    return h('div', { class: 'state', role: 'status', 'aria-live': 'polite' },
      h('div', { class: 'spinner' }), h('div', {}, label));
  };

  AgentRegistryElement.prototype._viewError = function (message, onRetry) {
    return h('div', { class: 'state', role: 'alert' },
      h('div', { class: 'error', text: '⚠️ ' + (message || 'Une erreur est survenue') }),
      h('button', { class: 'retry', type: 'button', onClick: onRetry }, 'Réessayer'));
  };

  AgentRegistryElement.prototype._viewList = function (state) {
    var self = this;
    if (!state.agents.length) {
      return h('div', { class: 'state' }, h('div', {}, '📭 Aucun agent dans le registre.'));
    }
    this._headerCells = {};
    var headRow = h('tr', {});
    COLUMNS.forEach(function (col) {
      var isSorted = state.sortKey === col.key;
      var arrowEl = h('span', { class: 'arrow' },
        isSorted ? (state.sortDir === 'asc' ? '▲' : '▼') : '↕');
      var th = h('th', {
        class: 'sortable', scope: 'col', tabindex: '0', role: 'columnheader',
        'aria-sort': isSorted ? (state.sortDir === 'asc' ? 'ascending' : 'descending') : 'none',
        onClick: function () { self._toggleSort(col.key); },
        onKeydown: function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); self._toggleSort(col.key); }
        }
      }, h('span', { class: 'th-in' },
        h('span', {}, col.emoji + ' ' + col.label), arrowEl));
      self._headerCells[col.key] = { th: th, arrow: arrowEl };
      headRow.appendChild(th);
    });

    this._tbodyEl = h('tbody', {});
    this._renderRowsInto(this._tbodyEl, state.agents);

    return h('table', { role: 'table', 'aria-label': 'Liste des agents' },
      h('thead', {}, headRow), this._tbodyEl);
  };

  AgentRegistryElement.prototype._renderRowsInto = function (tbody, agents) {
    var self = this;
    agents.forEach(function (agent) { tbody.appendChild(self._agentRow(agent)); });
  };

  AgentRegistryElement.prototype._renderRows = function () {
    if (!this._tbodyEl) return;
    this._tbodyEl.innerHTML = '';
    this._renderRowsInto(this._tbodyEl, this._store.get().agents);
  };

  AgentRegistryElement.prototype._syncSortIndicators = function () {
    var s = this._store.get();
    var cells = this._headerCells;
    if (!cells) return;
    COLUMNS.forEach(function (col) {
      var cell = cells[col.key];
      if (!cell) return;
      var sorted = s.sortKey === col.key;
      cell.th.setAttribute('aria-sort',
        sorted ? (s.sortDir === 'asc' ? 'ascending' : 'descending') : 'none');
      cell.arrow.textContent = sorted ? (s.sortDir === 'asc' ? '▲' : '▼') : '↕';
    });
  };

  AgentRegistryElement.prototype._agentRow = function (agent) {
    var self = this;
    function boolCell(value, label) {
      var cb = h('input', { type: 'checkbox', class: 'check', disabled: 'disabled',
        'aria-label': label + (value ? ' activé' : ' désactivé') });
      cb.checked = !!value;
      return h('td', {}, h('span', { class: 'bool' }, cb, h('span', {}, value ? '✅' : '⬜')));
    }
    var open = function () { self._selectAgent(agent); };
    return h('tr', {
      tabindex: '0', role: 'button',
      'aria-label': 'Voir les objets de ' + (agent.display_name || agent.id),
      onClick: open,
      onKeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }
    },
      h('td', { class: 'cell-id' }, agent.id),
      h('td', { class: 'cell-name' }, agent.agent_name),
      h('td', {}, h('span', { class: 'tag' }, agent.domain || '—')),
      h('td', {}, h('div', { class: 'desc', title: agent.description }, agent.description || '—')),
      boolCell(agent.rag_enabled, 'RAG'),
      boolCell(agent.skills_enabled, 'Skills'));
  };

  AgentRegistryElement.prototype._viewDetailShell = function (state, inner) {
    var agent = state.selectedAgent || {};
    var toolbar = h('div', { class: 'toolbar' },
      h('button', { class: 'back', type: 'button', onClick: this._backToList.bind(this) },
        iconSpan(ICON_BACK), 'Agents'),
      h('div', { class: 'crumb' }, [
        document.createTextNode('Objets de '),
        h('b', {}, agent.display_name || agent.agent_name || agent.id)
      ]));
    return h('div', {}, toolbar, h('div', { class: 'pad' }, inner));
  };

  AgentRegistryElement.prototype._viewDetail = function (state) {
    var self = this;
    var keys = state.objectKeys || [];
    var detail = state.agentDetail;
    var content = h('div', {});

    if (detail && detail.identity) content.appendChild(this._promptPanel(detail.identity));
    if (detail && detail.skills && detail.skills.length) content.appendChild(this._skillsPanel(detail.skills));

    // AGENT.md / SKILL.md are already shown above (nicely formatted): don't
    // duplicate them in the raw accordion list once the detail call succeeded.
    var hideFromRaw = {};
    if (detail && detail.identity) { hideFromRaw['AGENT.md'] = true; hideFromRaw['AGENTS.md'] = true; }
    if (detail && detail.skills && detail.skills.length) hideFromRaw['SKILL.md'] = true;
    var raw = keys.filter(function (k) { return !hideFromRaw[k.split('/').pop()]; });

    if (!raw.length) {
      if (!content.childNodes.length) {
        content.appendChild(h('div', { class: 'state' }, h('div', {}, '📭 Aucun objet pour cet agent.')));
      }
    } else {
      raw.forEach(function (key) { content.appendChild(self._accordion(key)); });
    }
    return this._viewDetailShell(state, content);
  };

  /** Prompt système (contenu de AGENT.md) — mis en avant, non replié, rendu en Markdown. */
  AgentRegistryElement.prototype._promptPanel = function (identity) {
    return h('section', { class: 'prompt-panel', 'aria-label': 'Prompt système' },
      h('div', { class: 'prompt-head' }, '🪪 Prompt système'),
      h('div', { class: 'prompt-body', tabindex: '0' }, renderMarkdownLite(identity)));
  };

  /** Skills de l'agent (contenu des SKILL.md) — un bloc non replié par skill, rendu en Markdown. */
  AgentRegistryElement.prototype._skillsPanel = function (skills) {
    var wrap = h('section', { class: 'skills-panel', 'aria-label': 'Skills' },
      h('div', { class: 'skills-head' }, '🧩 Skills'));
    skills.forEach(function (skill) {
      wrap.appendChild(h('div', { class: 'skill-block' },
        h('div', { class: 'skill-name' }, skill.name),
        h('div', { class: 'skill-body' }, renderMarkdownLite(skill.content || '(vide)'))));
    });
    return wrap;
  };

  /** One accordion per object, CLOSED by default; content lazy-loaded on first open. */
  AgentRegistryElement.prototype._accordion = function (key) {
    var self = this;
    var panelId = uid('arw-panel');
    var pre = h('pre', { tabindex: '0' }, '');
    var panel = h('div', { class: 'acc-panel', id: panelId, hidden: 'hidden' }, pre);
    var loaded = false;

    var head = h('button', {
      class: 'acc-head', type: 'button', 'aria-expanded': 'false', 'aria-controls': panelId
    },
      h('span', { class: 'acc-emoji' }, objectEmoji(key)),
      h('span', { class: 'acc-key', title: key }, key),
      iconSpan(ICON_CHEVRON, 'acc-chevron'));

    var acc = h('div', { class: 'acc' }, head, panel);

    head.addEventListener('click', function () {
      var isOpen = acc.hasAttribute('open');
      if (isOpen) {
        acc.removeAttribute('open'); panel.hidden = true; head.setAttribute('aria-expanded', 'false');
        return;
      }
      acc.setAttribute('open', ''); panel.hidden = false; head.setAttribute('aria-expanded', 'true');
      if (loaded) return;
      loaded = true;
      pre.textContent = '⏳ Chargement…';
      self._client.getObject(key).then(function (text) {
        pre.textContent = text && text.length ? text : '(objet vide)';
        self._emit('object-loaded', { key: key });
      }).catch(function (err) {
        loaded = false;
        pre.textContent = '⚠️ ' + humanizeError(err);
      });
    });
    return acc;
  };

  AgentRegistryElement.prototype._backToList = function () {
    this._gen++; // ignore any in-flight detail load
    this._store.set({ view: 'list', selectedAgent: null, objectKeys: null, agentDetail: null, error: null });
  };

  // ---- helpers -------------------------------------------------------------

  AgentRegistryElement.prototype._headingText = function () {
    return this.getAttribute('heading') || TAG_NAME;
  };
  AgentRegistryElement.prototype._syncHeading = function () {
    if (this._heading) this._heading.textContent = this._headingText();
  };

  AgentRegistryElement.prototype._focusFirst = function () {
    var el = this._dialog && this._dialog.querySelector('.icon-btn');
    if (el) el.focus();
  };

  AgentRegistryElement.prototype._focusable = function () {
    if (!this._dialog) return [];
    return Array.prototype.slice.call(this._dialog.querySelectorAll(
      'button, [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  };

  AgentRegistryElement.prototype._trapFocus = function (e) {
    var items = this._focusable();
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    var active = this.shadowRoot.activeElement;
    if (e.shiftKey && active === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  };

  AgentRegistryElement.prototype._emit = function (name, detail) {
    this.dispatchEvent(new CustomEvent(EVENT_NS + ':' + name, {
      detail: detail || {}, bubbles: true, composed: true
    }));
  };

  function humanizeError(err) {
    if (!err) return 'Erreur inconnue';
    if (err.status === 401 || err.status === 403) return 'Accès refusé : clé API invalide ou manquante.';
    if (err.status === 404) return 'Ressource introuvable.';
    if (err.name === 'TypeError') return 'Impossible de joindre l’API (réseau / CORS).';
    return err.message || String(err);
  }

  function stripTrailingSlash(url) { return String(url).replace(/\/+$/, ''); }

  // ============================================================================
  // 11. FIXTURES — mirror the real registry so the offline demo is realistic
  // ============================================================================

  var DEFAULT_FIXTURES = buildFixtures();

  function buildFixtures() {
    var agents = [
      { id: 'equipy', agent_name: 'AgentEquipy', display_name: 'Assistant Equipy',
        domain: 'Equipement et financement',
        description: 'Assistant IA expert de la Direction Financement de l\'Equipement (DFE). Leasing, crédit-bail, LOA, LLD, financement structuré.',
        rag_enabled: true, skills_enabled: true, backend_url: 'http://localhost:8000' },
      { id: 'AgentJarvis', agent_name: 'AgentJarvis', display_name: 'Assistant Jarvis',
        domain: 'Finance, paiement et garantie',
        description: 'Assistant métier finance, paiement et garantie Bpifrance.',
        rag_enabled: true, skills_enabled: true, backend_url: 'http://localhost:8000' },
      { id: 'AgentMaNotif', agent_name: 'AgentMaNotif', display_name: 'Assistant MaNotif',
        domain: 'Outil de notifications Bpifrance (MaNotif)',
        description: 'Assistant de l\'outil de notifications MaNotif.',
        rag_enabled: false, skills_enabled: true, backend_url: 'http://localhost:8000' },
      { id: 'AgentRET', agent_name: 'AgentRET', display_name: 'Assistant RET',
        domain: 'Conquête et relation client Bpifrance',
        description: 'Assistant conquête et relation client.',
        rag_enabled: true, skills_enabled: false, backend_url: 'http://localhost:8000' },
      { id: 'router', agent_name: 'AgentRouter', display_name: 'Assistant Routeur',
        domain: 'Business et IA',
        description: 'Agent routeur : oriente la requête vers le bon agent métier.',
        rag_enabled: false, skills_enabled: true, backend_url: 'http://localhost:8000' },
      { id: 'toad', agent_name: 'AgentToad', display_name: 'Assistant Toad',
        domain: 'Documentation GDC OAD (Outil d\'Aide à la Décision)',
        description: 'Assistant documentaire GDC / OAD.',
        rag_enabled: true, skills_enabled: true, backend_url: 'http://localhost:8000' },
      { id: 'AgentUltron', agent_name: 'AgentUltron', display_name: 'Assistant Ultron',
        domain: 'Analyse de risque de paiement / affacturage',
        description: 'Analyse du risque de paiement et de l\'affacturage.',
        rag_enabled: true, skills_enabled: true, backend_url: 'http://localhost:8000' },
      { id: 'AgentVision', agent_name: 'AgentVision', display_name: 'Assistant Vision',
        domain: 'Contrats de marchés publics et privés',
        description: 'Analyse de contrats de marchés publics et privés.',
        rag_enabled: true, skills_enabled: true, backend_url: 'http://localhost:8000' }
    ];

    var objects = {};
    function add(folder, agent) {
      objects[folder + '/AGENT.md'] =
        '# ' + agent.display_name + '\n\n' +
        '- **id**: ' + agent.id + '\n- **domaine**: ' + agent.domain + '\n\n' +
        agent.description + '\n';
      objects[folder + '/agent.yaml'] =
        'id: ' + agent.id + '\n' +
        'agent_name: ' + agent.agent_name + '\n' +
        'display_name: ' + agent.display_name + '\n' +
        'domain: ' + agent.domain + '\n' +
        'description: ' + agent.description + '\n' +
        'backendurl: ' + agent.backend_url + '\n' +
        'skills:\n  enable: ' + agent.skills_enabled + '\n' +
        'rag:\n  enabled: ' + agent.rag_enabled + '\n';
      if (agent.skills_enabled) {
        objects[folder + '/skills/rag/SKILL.md'] =
          '# Skill: rag\n\nInterroge la base documentaire métier de ' + agent.display_name + '.\n';
      }
    }
    // Folder names intentionally differ from ids for several agents (real registry).
    add('equipy', agents[0]);
    add('jarvis', agents[1]);
    add('manotif', agents[2]);
    add('ret', agents[3]);
    add('router', agents[4]);
    add('toad', agents[5]);
    add('ultron', agents[6]);
    add('vision', agents[7]);

    // A couple of richer objects for equipy to make the accordion demo meaningful.
    objects['equipy/skills/lexique_dfe/SKILL.md'] =
      '# Skill: lexique_dfe\n\nLexique métier DFE : VL, PL, TP, LOA, LLD, crédit-bail,\n' +
      'loi de roulage, durée de vie, cotation, garanties…\n';

    return { agents: agents, objects: objects };
  }

  // ============================================================================
  // 12. REGISTRATION + public namespace (also used by the in-browser tests)
  // ============================================================================

  var api = {
    VERSION: VERSION,
    COLUMNS: COLUMNS,
    toAgentSummary: toAgentSummary,
    objectEmoji: objectEmoji,
    normalizeName: normalizeName,
    createComparator: createComparator,
    createStore: createStore,
    createClient: createClient,
    escapeHtml: escapeHtml,
    ApiError: ApiError,
    HttpAgentRegistryClient: HttpAgentRegistryClient,
    MockAgentRegistryClient: MockAgentRegistryClient,
    CachingAgentRegistryClient: CachingAgentRegistryClient,
    AgentObjectResolver: AgentObjectResolver,
    fixtures: DEFAULT_FIXTURES,
    Element: AgentRegistryElement
  };

  if (typeof customElements !== 'undefined' && !customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, AgentRegistryElement);
  }
  global.AgentRegistry = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof window !== 'undefined' ? window : this);
