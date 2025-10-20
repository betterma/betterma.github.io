const auth = (function() {
  const TOKEN_KEY = 'babyplan:github_token';
  
  return {
    getToken() {
      return localStorage.getItem(TOKEN_KEY);
    },
    
    setToken(token) {
      localStorage.setItem(TOKEN_KEY, token);
    },
    
    clearToken() {
      localStorage.removeItem(TOKEN_KEY);
    },
    
    isAuthenticated() {
      return !!this.getToken();
    }
  };
})();