// storage.js
const BabyStorage = (function() {
  const GITHUB_USERNAME = 'betterma';
  const GITHUB_REPO = 'mazha';
  const BASE_PATH = 'baby_plan/data';
  const TOKEN = 'git'+'hub_pat_11AJKESVI04gWNYmNe'+'UflS_IrzWyyWiIJrvY8ZXAss7C7GQYg3OlPnWmBGqSdVFsqsAJPFBPTIE5ksm9jp'; // TODO: 替换为你的真实token


  // 私有方法
  async function request(endpoint, options = {}) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/${endpoint}`;
    console.log('请求API:', url); // 添加调试日志
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          ...(options.headers || {})
        }
      });
      
      const responseText = await response.text();
      console.log('API响应:', responseText); // 添加调试日志
      
      if (!response.ok) {
        throw new Error(`GitHub API错误：${response.status} - ${responseText}`);
      }
      
      return JSON.parse(responseText);
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
        const file = await request(`contents/${BASE_PATH}/tasks.json`);
        // GitHub API 返回的是 base64 编码的内容
        if (!file.content) {
          console.error('任务文件内容为空');
          return [];
        }
        const content = decodeContent(file.content);
        console.log('解析后的任务数据:', content); // 添加调试日志
        return Array.isArray(content) ? content : [];
      } catch (error) {
        console.error('获取任务列表失败:', error);
        return [];
      }
    },

    async saveTasks(tasks) {
      cache.delete('tasks'); // 清除缓存
      const filePath = `${BASE_PATH}/tasks.json`;
      let sha = null;
      
      try {
        const existing = await request(`contents/${filePath}`);
        sha = existing.sha;
      } catch (e) {
        // 文件不存在
      }

      return request(`contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `更新任务列表 - ${new Date().toISOString()}`,
          content: encodeContent(tasks),
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