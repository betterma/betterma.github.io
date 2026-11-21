// auth.js - 与 pages 共用 GithubTokenVault（密码解锁，无明文 PAT）
const auth = (function () {
  function vault() {
    return (
      (typeof globalThis !== "undefined" && globalThis.GithubTokenVault) ||
      (typeof window !== "undefined" && window.GithubTokenVault) ||
      null
    );
  }

  function readToken() {
    const v = vault();
    if (!v || !v.isUnlocked()) return "";
    try {
      return String(v.getToken() || "").trim();
    } catch (_) {
      return "";
    }
  }

  return {
    isAuthenticated: function () {
      return !!readToken();
    },

    getToken: function () {
      return readToken();
    },

    saveToken: function () {
      console.warn("请用密码解锁 GithubTokenVault");
    },

    logout: function () {
      const v = vault();
      if (v) v.lock({ clearPass: false });
    },

    ensureUnlocked: async function () {
      const v = vault();
      if (!v) throw new Error("GithubTokenVault 未加载");
      if (v.isUnlocked()) return v.getToken();
      if (await v.tryAutoUnlock()) return v.getToken();
      return v.ensureUnlocked();
    },
  };
})();
