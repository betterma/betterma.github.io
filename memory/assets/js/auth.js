// auth.js - 访问凭据管理
// 历史上这里硬编码过一个 GitHub PAT（明文放在公开仓库），已被 GitHub 吊销，
// 所有接口因此返回 401 Bad credentials。现在不再内置任何令牌：
// 读取走公开静态文件，不需要令牌；写入由使用者在本机填入自己的 PAT，
// 只保存在浏览器 localStorage，不会进入仓库。
const auth = (function () {
  const TOKEN_KEY = 'github_token';

  function readToken() {
    try {
      return (window.localStorage.getItem(TOKEN_KEY) || '').trim();
    } catch (e) {
      return '';
    }
  }

  return {
    // 页面访问由 index.html 的密码门负责；保留此接口以兼容 editor/bookmarks 等页面。
    isAuthenticated: function () {
      return true;
    },

    // 是否存在可用于写入的令牌
    hasToken: function () {
      return !!readToken();
    },

    getToken: readToken,

    saveToken: function (token) {
      const value = String(token || '').trim();
      try {
        if (value) window.localStorage.setItem(TOKEN_KEY, value);
        else window.localStorage.removeItem(TOKEN_KEY);
      } catch (e) {
        console.warn('令牌保存失败（可能是隐私模式）', e);
      }
    },

    clearToken: function () {
      try {
        window.localStorage.removeItem(TOKEN_KEY);
      } catch (e) {}
    },

    // 退出登录只清密码门，保留本机令牌，避免每次都要重新填
    logout: function () {
      try {
        window.sessionStorage.removeItem('isAuthed');
      } catch (e) {}
    },

    tokenMask: function () {
      const token = readToken();
      if (!token) return '未设置';
      return token.slice(0, 10) + '••••' + token.slice(-4);
    },

    // 令牌需要对 betterma/betterma.github.io 的 Contents 具备读写权限
    repo: { owner: 'betterma', name: 'betterma.github.io' }
  };
})();
