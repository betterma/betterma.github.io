// auth.js - 访问凭据：与 pages 共用 GithubTokenVault（密码解锁内嵌 PAT）
// 读取走公开静态文件可不需令牌；写入需先解锁保险库。
const auth = (function () {
  function vault() {
    return (
      (typeof globalThis !== "undefined" && globalThis.GithubTokenVault) ||
      (typeof window !== "undefined" && window.GithubTokenVault) ||
      null
    );
  }

  function readVaultToken() {
    const v = vault();
    if (!v || !v.isUnlocked()) return "";
    try {
      return String(v.getToken() || "").trim();
    } catch (_) {
      return "";
    }
  }

  return {
    // 页面访问由 login.html 密码门负责。
    isAuthenticated: function () {
      try {
        return sessionStorage.getItem("isAuthed") === "1";
      } catch (_) {
        return false;
      }
    },

    hasToken: function () {
      return !!readVaultToken();
    },

    getToken: function () {
      return readVaultToken();
    },

    /** 尝试记住密码自动解锁；失败返回 false。 */
    tryUnlock: async function () {
      const v = vault();
      if (!v) return false;
      if (v.isUnlocked()) return true;
      try {
        return !!(await v.tryAutoUnlock());
      } catch (_) {
        return false;
      }
    },

    /** 用 pages 同款密码解锁。 */
    unlockWithPassword: async function (password, options) {
      const v = vault();
      if (!v) throw new Error("GithubTokenVault 未加载");
      await v.unlock(String(password || ""), options);
      return v.getToken();
    },

    // 不再接受明文 PAT；保留空实现以免旧 UI 报错。
    saveToken: function () {
      console.warn("请改用密码解锁 GithubTokenVault，不再保存明文令牌");
    },

    clearToken: function () {
      const v = vault();
      if (v) v.lock({ clearPass: true });
    },

    logout: function () {
      try {
        window.sessionStorage.removeItem("isAuthed");
      } catch (_) {}
      const v = vault();
      if (v) v.lock({ clearPass: false });
    },

    tokenMask: function () {
      const token = readVaultToken();
      if (!token) return "未解锁";
      return token.slice(0, 10) + "••••" + token.slice(-4);
    },

    repo: { owner: "betterma", name: "betterma.github.io" },
  };
})();
