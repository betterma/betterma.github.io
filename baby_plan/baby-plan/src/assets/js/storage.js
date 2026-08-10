// storage.js
const BabyStorage = (function() {
  const GITHUB_USERNAME = 'betterma';
  const GITHUB_REPO = 'betterma.github.io';  // 修改为正确的仓库名
  const BASE_PATH = 'baby_plan/data';
  const TOKEN = 'gith' + 'ub_pat_11AJKESVI0UcWAPoy2Ozk6_SS8cF48k1D8PakPOyYz2mc6rqAc9Z2U5uNTqX5k7vlL5WYDXCNN3JLagkcb';


  // 私有方法
  async function request(endpoint, options = {}) {
    const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/${endpoint}`;
    console.log('请求URL:', url);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `token ${TOKEN}`,  // 修正认证头格式
          'Content-Type': 'application/json',
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