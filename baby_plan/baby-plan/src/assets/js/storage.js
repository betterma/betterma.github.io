// storage.js
// 读取：公开 Contents API，无需令牌；写入：必须先解锁 github-token-vault.js（见 auth.js）。
const BabyStorage = (function() {
  const GITHUB_USERNAME = 'betterma';
  const GITHUB_REPO = 'betterma.github.io';
  const BASE_PATH = 'baby_plan/data';

  function tokenProvider() {
    return (typeof window !== 'undefined' && window.auth) ||
           (typeof auth !== 'undefined' ? auth : null);
  }

  // 写操作强制解锁；读操作有令牌则带上（避免限流），无令牌则匿名读取公开仓库。
  async function authHeaders(isWrite) {
    const provider = tokenProvider();
    const headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    };
    let token = provider && typeof provider.getToken === 'function' ? provider.getToken() : '';
    if (!token && isWrite && provider && typeof provider.ensureUnlocked === 'function') {
      token = await provider.ensureUnlocked();
    } else if (!token && provider && typeof provider.hasSavedPass === 'function' && provider.hasSavedPass()) {
      try { token = await provider.tryUnlock() ? provider.getToken() : ''; } catch (_) {}
    }
    if (token) headers['Authorization'] = `Bearer ${token}`;
    else if (isWrite) throw new Error('尚未解锁写权限，请先用保险库密码登录。');
    return headers;
  }

  // 私有方法
  async function request(endpoint, options = {}) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/${endpoint}`;
    const method = String(options.method || 'GET').toUpperCase();
    const isWrite = method !== 'GET' && method !== 'HEAD';

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...(await authHeaders(isWrite)),
          ...(options.headers || {})
        }
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        console.error('API错误:', {
          status: response.status,
          response: responseText
        });
        throw new Error(`GitHub API错误: ${response.status} - ${responseText}`);
      }

      return responseText ? JSON.parse(responseText) : null;
    } catch (error) {
      console.error('请求失败:', error);
      throw error;
    }
  }

  // 添加缓存机制
  const cache = new Map();
  const CACHE_TIME = 5 * 60 * 1000; // 5分钟缓存

  async function getCached(key, fetcher) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TIME) {
      return cached.data;
    }
    const data = await fetcher();
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
    return data;
  }

  // 工具方法
  function encodeContent(content) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(content))));
  }

  function decodeContent(base64Content) {
    return JSON.parse(decodeURIComponent(escape(atob(base64Content))));
  }

  // 公共接口
  return {
    // 任务相关
    async getTasks() {
      try {
        console.log('开始获取任务');
        const response = await request(`contents/${BASE_PATH}/tasks.json`);
        
        if (!response || !response.content) {
          console.log('任务文件为空，返回空数组');
          return [];
        }

        // 解码 base64 内容
        const content = decodeContent(response.content);
        console.log('解码后的任务:', content);

        // 确保返回的是数组
        return Array.isArray(content) ? content : [];
      } catch (error) {
        console.error('获取任务失败:', error);
        if (error.message.includes('404')) {
          return [];
        }
        throw error;
      }
    },

    async saveTasks(tasks) {
      console.log('准备保存任务:', tasks);
      const filePath = `${BASE_PATH}/tasks.json`;
      let sha = null;

      try {
        // 获取现有文件的 SHA
        const existing = await request(`contents/${filePath}`);
        sha = existing.sha;
      } catch (e) {
        console.log('文件不存在，将创建新文件');
      }

      return request(`contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `更新任务列表 - ${new Date().toISOString()}`,
          content: encodeContent(Array.isArray(tasks) ? tasks : [tasks]),
          ...(sha ? { sha } : {})
        })
      });
    },

    // 打卡记录相关 
    async getRecords(date) {
      const yearMonth = date.substring(0, 7);
      const cacheKey = `records:${yearMonth}`;
      
      return getCached(cacheKey, async () => {
        const filePath = `${BASE_PATH}/records/${yearMonth}.json`;
        try {
          const file = await request(`contents/${filePath}`);
          const records = decodeContent(file.content);
          return records[date] || {};
        } catch (error) {
          return {};
        }
      });
    },

    async saveRecord(date, taskId, data) {
      const yearMonth = date.substring(0, 7);
      cache.delete(`records:${yearMonth}`); // 清除缓存
      
      const filePath = `${BASE_PATH}/records/${yearMonth}.json`;
      let records = {};
      let sha = null;
      
      try {
        const file = await request(`contents/${filePath}`);
        records = decodeContent(file.content);
        sha = file.sha;
      } catch (e) {
        // 文件不存在
      }

      if (!records[date]) {
        records[date] = {};
      }
      
      records[date][taskId] = {
        ...records[date][taskId],
        ...data,
        updatedAt: new Date().toISOString()
      };

      return request(`contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `更新打卡记录 ${date}`,
          content: encodeContent(records),
          ...(sha ? { sha } : {})
        })
      });
    },

    // 设置相关
    async getMeta() {
      return getCached('meta', async () => {
        try {
          const file = await request(`contents/${BASE_PATH}/meta.json`);
          return decodeContent(file.content);
        } catch (error) {
          return {
            startDate: '2025-09-07',
            theme: 'pink'
          };
        }
      });
    },

    async setMeta(meta) {
      cache.delete('meta'); // 清除缓存
      const filePath = `${BASE_PATH}/meta.json`;
      let sha = null;
      
      try {
        const existing = await request(`contents/${filePath}`);
        sha = existing.sha;
      } catch (e) {
        // 文件不存在
      }

      const current = await this.getMeta();
      const updated = { ...current, ...meta };

      return request(`contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `更新设置信息 - ${new Date().toISOString()}`,
          content: encodeContent(updated),
          ...(sha ? { sha } : {})
        })
      });
    },

    // 清除缓存
    clearCache() {
      cache.clear();
    },

    // 强制刷新
    async refresh(type) {
      if(type) {
        cache.delete(type);
      } else {
        cache.clear();
      }
    }
  };
})();

// 挂载到全局
window.BabyStorage = BabyStorage;