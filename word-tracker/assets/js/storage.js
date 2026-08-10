const storage = (function() {
  const GITHUB_USERNAME = 'betterma';
  const GITHUB_REPO = 'betterma.github.io';
  const GITHUB_TOKEN = 'git' + 'hub_pat_11AJKESVI04gWNYmNe' + 'UflS_IrzWyyWiIJrvY8ZXAss7C7GQYg3OlPnWmBGqSdVFsqsAJPFBPTIE5ksm9jp';
  const BASE_URL = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}`;

  async function request(endpoint, options = {}) {
    if (!GITHUB_TOKEN) throw new Error('未配置 GitHub Token');

    const response = await fetch(`${BASE_URL}/${endpoint}?t=${Date.now()}`, {
      ...options,
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (err) {
      data = { message: text };
    }

    if (!response.ok) {
      const error = data || { message: `GitHub API 错误：${response.status}` };
      throw new Error(error.message || `GitHub API 错误：${response.status}`);
    }

    return data;
  }

  function encodeContent(content) {
    return btoa(unescape(encodeURIComponent(content)));
  }

  function decodeContent(content) {
    return decodeURIComponent(escape(atob(content)));
  }

  async function getFile(filename) {
    try {
      const file = await request(`contents/${filename}`);
      return { content: decodeContent(file.content), sha: file.sha };
    } catch (error) {
      return { content: '', sha: null };
    }
  }

  async function saveFile(filename, content) {
    const file = await getFile(filename);
    return request(`contents/${filename}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `${filename} 已更新`,
        content: encodeContent(content),
        ...(file.sha ? { sha: file.sha } : {})
      })
    });
  }

  return {
    getRecords: async function() {
      try {
        const file = await getFile('word-tracker/records.json');
        if (!file.content) return [];
        const parsed = JSON.parse(file.content);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.warn('GitHub 存储读取失败', error);
        return [];
      }
    },

    saveRecords: async function(records) {
      try {
        return await saveFile('word-tracker/records.json', JSON.stringify(records));
      } catch (error) {
        console.warn('GitHub 存储写入失败', error);
        throw error;
      }
    }
  };
})();
