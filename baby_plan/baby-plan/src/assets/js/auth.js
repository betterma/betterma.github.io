// auth.js - 宝贝计划访问凭据
// 不再接受明文 PAT：统一复用根目录 github-token-vault.js（PBKDF2 + AES-GCM 加密密文，密码解锁）。
// 读取公开仓库数据可不解锁；写入必须先解锁保险库。
const auth = (function () {
  const PASS_KEY = "pages-gh-vault-pass-v1";
  // 本目录位于 baby_plan/baby-plan/src/，向上三级即仓库根。
  // 若部署在别的路径（如 /pages/baby/），再试站点根部的同名文件。
  const VAULT_PATHS = ["../../../github-token-vault.js", "/github-token-vault.js"];

  function vault() {
    return (
      (typeof window !== "undefined" && window.GithubTokenVault) ||
      (typeof globalThis !== "undefined" && globalThis.GithubTokenVault) ||
      null
    );
  }

  function loadVault() {
    if (vault()) return Promise.resolve(vault());
    return new Promise(function (resolve, reject) {
      let i = 0;
      function next() {
        if (i >= VAULT_PATHS.length) {
          reject(new Error("保险库未加载，请检查 github-token-vault.js"));
          return;
        }
        const script = document.createElement("script");
        script.src = VAULT_PATHS[i++];
        script.onload = function () { vault() ? resolve(vault()) : next(); };
        script.onerror = next;
        document.head.appendChild(script);
      }
      next();
    });
  }

  function getToken() {
    const v = vault();
    if (!v || !v.isUnlocked()) return "";
    try {
      return String(v.getToken() || "").trim();
    } catch (_) {
      return "";
    }
  }

  function hasSavedPass() {
    try {
      return !!window.localStorage.getItem(PASS_KEY);
    } catch (_) {
      return false;
    }
  }

  async function tryUnlock() {
    const v = await loadVault();
    if (v.isUnlocked()) return true;
    try {
      return !!(await v.tryAutoUnlock());
    } catch (_) {
      return false;
    }
  }

  async function ensureUnlocked() {
    const v = await loadVault();
    if (v.isUnlocked()) return v.getToken();
    if (await v.tryAutoUnlock()) return v.getToken();
    if (!v.hasBlob()) {
      throw new Error("尚未封存 Token：请先更新 github-token-vault.js 的 EMBEDDED_BLOB");
    }
    const pass = window.prompt("输入解密密码（与 Pages 交易台同一套）");
    if (!pass) throw new Error("已取消：未解锁写权限");
    await v.unlock(String(pass), { remember: true });
    return v.getToken();
  }

  return {
    getToken: getToken,
    hasToken: function () { return !!getToken(); },
    hasSavedPass: hasSavedPass,
    isAuthenticated: function () { return !!getToken(); },
    tryUnlock: tryUnlock,
    ensureUnlocked: ensureUnlocked,

    unlockWithPassword: async function (password, remember) {
      const v = await loadVault();
      await v.unlock(String(password || ""), { remember: remember !== false });
      return v.getToken();
    },

    // 兼容旧 UI：不再保存明文令牌。
    setToken: function () {
      console.warn("已停用明文 PAT 登录，请改用保险库密码解锁");
    },
    clearToken: function () {
      const v = vault();
      if (v) v.lock({ clearPass: true });
    },
    logout: function () {
      const v = vault();
      if (v) v.lock();
    },
    tokenMask: function () {
      const t = getToken();
      if (!t) return "未解锁";
      return t.slice(0, 10) + "••••" + t.slice(-4);
    }
  };
})();
