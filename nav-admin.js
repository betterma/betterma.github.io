// nav-admin.js - 导航配置的读取与保存
// 读取：同源静态 nav-config.json，公开仓库无需令牌。
// 保存：解锁 github-token-vault.js 后走 GitHub Contents API（PUT），与 memory/sleep 同一套密码。
(function (global) {
  "use strict";

  const OWNER = "betterma";
  const REPO = "betterma.github.io";
  const PATH = "nav-config.json";
  const API = `https://api.github.com/repos/${OWNER}/${REPO}`;

  function vault() {
    return (
      (typeof globalThis !== "undefined" && globalThis.GithubTokenVault) ||
      (typeof window !== "undefined" && window.GithubTokenVault) ||
      null
    );
  }

  function token() {
    const v = vault();
    if (!v || !v.isUnlocked()) return "";
    try {
      return String(v.getToken() || "").trim();
    } catch (_) {
      return "";
    }
  }

  function encodeBase64(text) {
    const bytes = new TextEncoder().encode(String(text));
    let binary = "";
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function decodeBase64(content) {
    const binary = atob(String(content || "").replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function codedError(code, message) {
    const err = new Error(message);
    err.code = code;
    return err;
  }

  async function apiRequest(endpoint, options) {
    const t = token();
    if (!t) {
      throw codedError("AUTH_REQUIRED", "尚未解锁写权限，请输入解密密码后再保存。");
    }
    const response = await fetch(`${API}/${endpoint}`, {
      ...(options || {}),
      headers: {
        Authorization: `Bearer ${t}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...((options && options.headers) || {})
      }
    });
    if (response.status === 401) {
      throw codedError("TOKEN_INVALID", "GitHub 令牌已失效（401），请更新保险库密文。");
    }
    if (response.status === 404) throw codedError("NOT_FOUND", "文件不存在");
    if (!response.ok) {
      let message = `GitHub API 错误：${response.status}`;
      try {
        const body = await response.json();
        if (body && body.message) message += " · " + body.message;
      } catch (_) {}
      throw new Error(message);
    }
    return response.status === 204 ? null : response.json();
  }

  const NavAdmin = {
    /** 静态读取配置（同源，带时间戳防缓存），失败返回 null。 */
    loadStatic: async function () {
      try {
        const url = new URL("./nav-config.json", document.baseURI);
        url.searchParams.set("t", String(Date.now()));
        const response = await fetch(url.href, { cache: "no-store" });
        if (!response.ok) return null;
        const json = await response.json();
        return json && Array.isArray(json.groups) ? json : null;
      } catch (_) {
        return null;
      }
    },

    /** 用已解锁的令牌从 GitHub 读取最新配置（含 sha），用于确认远端内容。 */
    loadRemote: async function () {
      const file = await apiRequest(`contents/${PATH}`);
      return {
        content: decodeBase64(file.content),
        sha: file.sha
      };
    },

    /** 保存配置到仓库；自动读取 sha，首次写入也能创建文件。 */
    save: async function (config) {
      const text = JSON.stringify(config, null, 2) + "\n";
      let sha;
      try {
        const current = await apiRequest(`contents/${PATH}`);
        sha = current.sha;
      } catch (e) {
        if (e.code !== "NOT_FOUND") throw e;
      }
      return apiRequest(`contents/${PATH}`, {
        method: "PUT",
        body: JSON.stringify({
          message: "更新首页导航分组",
          content: encodeBase64(text),
          branch: "main",
          ...(sha ? { sha } : {})
        })
      });
    },

    // —— 保险库操作 ——
    isUnlocked: function () {
      const v = vault();
      return !!(v && v.isUnlocked());
    },

    tryAutoUnlock: async function () {
      const v = vault();
      if (!v) return false;
      if (v.isUnlocked()) return true;
      try {
        return !!(await v.tryAutoUnlock());
      } catch (_) {
        return false;
      }
    },

    unlock: async function (password, remember) {
      const v = vault();
      if (!v) throw new Error("保险库未加载，请检查 github-token-vault.js");
      await v.unlock(String(password || ""), { remember: remember !== false });
      return true;
    },

    lock: function () {
      const v = vault();
      if (v) v.lock();
    },

    hasVault: function () {
      return !!vault();
    }
  };

  global.NavAdmin = NavAdmin;
})(window);
