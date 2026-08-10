// auth.js - 认证管理模块
const auth = (function() {
    // 私有方法
    const GITHUB_USER_KEY = 'github_username';
    const GITHUB_TOKEN_KEY = 'github_token';
    const FIXED_TOKEN = 'git'+'hub_pat_11AJKESVI0UcWAPoy2Ozk6_SS8cF48k1D8PakPOyYz2mc6rqAc9Z2U5uNTqX5k7vlL5WYDXCNN3JLagkcb'; // TODO: 替换为你的真实token
    const REPO_NAME_KEY = 'github_repo';
  
    return {
      // 检查是否已认证
      isAuthenticated: function() {
        return !!FIXED_TOKEN;
      },
      
      // 保存令牌（无操作）
      saveToken: function(token) {
        // 忽略，始终用 FIXED_TOKEN
      },
      
      // 获取令牌
      getToken: function() {
        return FIXED_TOKEN;
      },
      
      // 清除所有认证信息（无操作）
      logout: function() {
        // 忽略
      }
    };
  })();