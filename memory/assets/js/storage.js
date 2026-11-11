// storage.js - 记忆读写层
// 读取：同源静态文件（diary-entries/index.json + *.md）优先，公开 GitHub API 兜底，
//       完全不需要令牌，因此不会再出现 401；日记仓库是公开仓库。
// 写入：需要使用者在本机填入自己的 GitHub PAT（见 auth.js），401 会给出明确提示。
// 仓库 betterma/mazha 已改名为 betterma/betterma.github.io，这里用新名字避免 301。
const storage = (function () {
  const API = `https://api.github.com/repos/${auth.repo.owner}/${auth.repo.name}`;
  const DIARY_DIR = 'memory/diary-entries';
  const INDEX_PATH = `${DIARY_DIR}/index.json`;
  const EXTRA_KEY = 'memory_extra_dates_v1';

  // 用本脚本的 URL 反推页面目录，不受 /memory 有无尾斜杠影响
  const BASE = (function () {
    try {
      const src = document.currentScript && document.currentScript.src;
      if (src) return new URL('../../', src).href;
    } catch (e) {}
    return new URL('.', document.baseURI).href;
  })();

  function staticUrl(repoPath) {
    // 仓库路径 memory/xxx 对应站点目录 ./xxx
    return new URL(String(repoPath).replace(/^memory\//, ''), BASE).href;
  }

  function diaryUrl(date) {
    return staticUrl(`${DIARY_DIR}/${date}.md`);
  }

  function tagged(url) {
    return url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
  }

  function codedError(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(String(text));
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function decodeBase64(content) {
    const binary = atob(String(content).replace(/\s/g, ''));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  // 带令牌的写通道（也用于有令牌时的即时读取）
  async function writeRequest(endpoint, options = {}) {
    const token = auth.getToken();
    if (!token) {
      throw codedError(
        'AUTH_REQUIRED',
        '尚未设置 GitHub 令牌，无法保存。请在「设置令牌」中填入具有 Contents 读写权限的 PAT。'
      );
    }

    let response;
    try {
      response = await fetch(`${API}/${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(options.headers || {})
        }
      });
    } catch (e) {
      throw new Error('网络请求失败：' + (e.message || e));
    }

    if (response.status === 401) {
      throw codedError(
        'TOKEN_INVALID',
        'GitHub 令牌已失效（401 Bad credentials），请在「设置令牌」中更换。'
      );
    }
    if (response.status === 404) throw codedError('NOT_FOUND', '文件不存在');
    if (!response.ok) {
      let message = `GitHub API 错误：${response.status}`;
      try {
        const body = await response.json();
        if (body && body.message) message += ' · ' + body.message;
      } catch (e) {}
      throw new Error(message);
    }
    return response.json();
  }

  // 匿名公开 API（仅作兜底，60 次/小时限流，正常情况下不触发）
  async function publicApi(endpoint) {
    const response = await fetch(tagged(`${API}/${endpoint}`), {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error(`GitHub API 错误：${response.status}`);
    return response.json();
  }

  async function fetchText(url) {
    const response = await fetch(tagged(url), { cache: 'no-store' });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`读取失败：${response.status} ${url}`);
    return response.text();
  }

  // 本机刚写入/删除的日期：静态索引由 Pages 部署，有约 1 分钟延迟，
  // 这里合并一份本地清单，保证写完立刻能在日历和列表里看到。
  function readExtraDates() {
    try {
      const value = JSON.parse(window.localStorage.getItem(EXTRA_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (e) {
      return [];
    }
  }
  function writeExtraDates(list) {
    try {
      window.localStorage.setItem(EXTRA_KEY, JSON.stringify(list.slice(0, 300)));
    } catch (e) {}
  }
  function addExtraDate(date) {
    writeExtraDates([...new Set([...readExtraDates(), date])]);
  }
  function removeExtraDate(date) {
    writeExtraDates(readExtraDates().filter((d) => d !== date));
  }

  function normalize(dates) {
    return [...new Set(dates)]
      .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
      .sort((a, b) => b.localeCompare(a))
      .map((date) => ({
        date,
        path: `${DIARY_DIR}/${date}.md`,
        url: diaryUrl(date)
      }));
  }

  async function listDates() {
    // 1) 静态索引：同源、无限流、无需令牌，绝大多数情况走这里
    try {
      const text = await fetchText(staticUrl(INDEX_PATH));
      if (text) {
        const json = JSON.parse(text);
        const dates = Array.isArray(json) ? json : json.dates || [];
        if (dates.length) return dates;
      }
    } catch (e) {
      console.warn('静态索引不可用，尝试公开 API', e);
    }

    // 2) 公开 API 兜底（新写入但索引尚未部署时能补上）
    try {
      const list = await publicApi(`contents/${DIARY_DIR}`);
      if (Array.isArray(list)) {
        return list
          .filter((item) => item.type === 'file' && item.name.endsWith('.md'))
          .map((item) => item.name.replace(/\.md$/, ''));
      }
    } catch (e) {
      console.warn('公开 API 也不可用', e);
    }

    // 3) 本机缓存，离线至少能看到清单
    const cached = readExtraDates();
    if (cached.length) return cached;
    throw new Error('无法读取记忆清单，请检查网络后点「刷新数据」重试。');
  }

  // 尽力把新日期写回静态索引，失败不影响正文保存
  async function syncIndex(date, removing) {
    try {
      let payload = { generatedAt: new Date().toISOString(), dates: [] };
      let sha;
      try {
        const current = await writeRequest(`contents/${INDEX_PATH}`);
        sha = current.sha;
        const parsed = JSON.parse(decodeBase64(current.content));
        payload.dates = Array.isArray(parsed) ? parsed : parsed.dates || [];
      } catch (e) {
        if (e.code !== 'NOT_FOUND') throw e;
      }
      const set = new Set(payload.dates);
      if (removing) set.delete(date);
      else set.add(date);
      payload.dates = [...set].sort((a, b) => b.localeCompare(a));
      await writeRequest(`contents/${INDEX_PATH}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `记忆索引 ${removing ? '移除' : '新增'} ${date}`,
          content: encodeBase64(JSON.stringify(payload, null, 2) + '\n'),
          ...(sha ? { sha } : {})
        })
      });
    } catch (e) {
      console.warn('索引同步失败（不影响正文保存）', e);
    }
  }

  function hasToken() {
    return typeof auth.hasToken === 'function' && auth.hasToken();
  }

  return {
    // 供页面判断只读状态
    isReadOnly: function () {
      return !hasToken();
    },

    // 获取所有记忆日期
    getEntries: async function () {
      const dates = await listDates();
      return normalize([...dates, ...readExtraDates()]);
    },

    // 读取单篇记忆
    getEntry: async function (date) {
      // 有令牌时优先走 API，避免刚写完就被 Pages 缓存挡住
      if (hasToken()) {
        try {
          const file = await writeRequest(`contents/${DIARY_DIR}/${date}.md`);
          return decodeBase64(file.content);
        } catch (e) {
          if (e.code === 'NOT_FOUND') return null;
          // 凭据失效不该影响浏览：静默回退静态文件，只在其它异常时记录
          if (e.code !== 'TOKEN_INVALID' && e.code !== 'AUTH_REQUIRED') {
            console.warn('API 读取失败，回退静态文件', e);
          }
        }
      }
      return fetchText(diaryUrl(date));
    },

    // 保存单篇记忆
    saveEntry: async function (date, content) {
      const filePath = `${DIARY_DIR}/${date}.md`;
      let sha;
      try {
        sha = (await writeRequest(`contents/${filePath}`)).sha;
      } catch (e) {
        if (e.code !== 'NOT_FOUND') throw e;
      }
      const result = await writeRequest(`contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `${date} ${content ? '记忆已更新' : '记忆已删除'}`,
          content: encodeBase64(content || ''),
          ...(sha ? { sha } : {})
        })
      });
      addExtraDate(date);
      void syncIndex(date, false);
      return result;
    },

    deleteEntry: async function (date) {
      const filePath = `${DIARY_DIR}/${date}.md`;
      const { sha } = await writeRequest(`contents/${filePath}`);
      const result = await writeRequest(`contents/${filePath}`, {
        method: 'DELETE',
        body: JSON.stringify({ message: `${date} 记忆已删除`, sha })
      });
      removeExtraDate(date);
      void syncIndex(date, true);
      return result;
    },

    // 读取任意文件（bookmarks.json / nav-links.json 等）
    getFile: async function (filename) {
      if (hasToken()) {
        try {
          const file = await writeRequest(`contents/${filename}`);
          return { content: decodeBase64(file.content), sha: file.sha };
        } catch (e) {
          if (e.code === 'NOT_FOUND') return { content: '', sha: null };
          if (e.code !== 'TOKEN_INVALID' && e.code !== 'AUTH_REQUIRED') {
            console.warn('API 读取失败，回退静态文件', e);
          }
        }
      }
      const text = await fetchText(staticUrl(filename));
      return { content: text === null ? '' : text, sha: null };
    },

    // 保存任意文件
    saveFile: async function (filename, content) {
      let sha;
      try {
        sha = (await writeRequest(`contents/${filename}`)).sha;
      } catch (e) {
        if (e.code !== 'NOT_FOUND') throw e;
      }
      return writeRequest(`contents/${filename}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `${filename} 已更新`,
          content: encodeBase64(content),
          ...(sha ? { sha } : {})
        })
      });
    }
  };
})();
