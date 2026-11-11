// index.js - 主页面逻辑
document.addEventListener('DOMContentLoaded', async function () {
  const $ = (id) => document.getElementById(id);
  const on = (id, event, handler) => {
    const el = $(id);
    if (el) el.addEventListener(event, handler);
  };
  const safeShowLoading = (text) => {
    if (typeof showLoading === 'function') showLoading(text);
  };
  const safeHideLoading = () => {
    if (typeof hideLoading === 'function') hideLoading();
  };

  let currentDate = dayjs();
  let entries = [];

  const calendarGrid = $('calendarGrid');
  const entriesContainer = $('entriesContainer');
  const currentMonth = $('currentMonth');
  const userDropdown = $('userDropdown');
  const userMenu = $('userMenu');

  // 检查认证状态（页面访问由密码门控制）
  if (!auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  // ---------- 状态提示条 ----------
  function showBanner(text, isError) {
    const banner = $('authBanner');
    const label = $('authBannerText');
    if (!banner || !label) return;
    label.textContent = text;
    banner.classList.toggle('is-error', !!isError);
    banner.hidden = false;
  }

  function hideBanner() {
    const banner = $('authBanner');
    if (banner) banner.hidden = true;
  }

  function refreshAuthBanner() {
    if (typeof auth.hasToken === 'function' && !auth.hasToken()) {
      showBanner('只读模式：历史记忆可正常浏览；写入 / 删除需要设置 GitHub 令牌。', false);
    } else {
      hideBanner();
    }
  }

  // 已设置令牌时静默探活一次：已失效就提前提示，避免等到写入才发现
  async function verifyTokenSilently() {
    if (typeof auth.hasToken !== 'function' || !auth.hasToken()) return;
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${auth.getToken()}`,
          Accept: 'application/vnd.github+json'
        }
      });
      if (response.status === 401) {
        showBanner('GitHub 令牌已失效（401），写入功能不可用，请点「设置令牌」更换。', true);
      }
    } catch (e) {
      // 网络不通不打扰用户，浏览仍走静态文件
    }
  }

  // ---------- 令牌设置弹层 ----------
  function setTokenHint(text, ok) {
    const hint = $('tokenHint');
    if (!hint) return;
    hint.textContent = text || '';
    hint.classList.toggle('is-ok', !!ok);
  }

  function openTokenModal() {
    const modal = $('tokenModal');
    if (!modal) return;
    if (userMenu) userMenu.classList.remove('show');
    const status = $('tokenStatus');
    if (status) {
      status.textContent =
        typeof auth.tokenMask === 'function'
          ? auth.tokenMask()
          : (auth.hasToken() ? '已设置' : '未设置');
    }
    const input = $('tokenInput');
    if (input) input.value = '';
    setTokenHint('');
    modal.hidden = false;
    if (input) input.focus();
  }

  function closeTokenModal() {
    const modal = $('tokenModal');
    if (modal) modal.hidden = true;
  }

  on('authBannerAction', 'click', openTokenModal);
  on('authBannerClose', 'click', hideBanner);
  on('tokenSettings', 'click', openTokenModal);
  on('tokenCancel', 'click', closeTokenModal);

  const tokenModal = $('tokenModal');
  if (tokenModal) {
    tokenModal.addEventListener('click', (event) => {
      if (event.target === tokenModal) closeTokenModal();
    });
  }

  on('tokenInput', 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const saveBtn = $('tokenSave');
      if (saveBtn) saveBtn.click();
    }
  });

  on('tokenClear', 'click', function () {
    auth.clearToken();
    const status = $('tokenStatus');
    if (status) status.textContent = '未设置';
    setTokenHint('已清除本机令牌，页面回到只读模式。', true);
    refreshAuthBanner();
  });

  on('tokenSave', 'click', async function () {
    const input = $('tokenInput');
    const saveBtn = $('tokenSave');
    const value = input ? input.value.trim() : '';
    if (!value) {
      setTokenHint('请先粘贴令牌。');
      return;
    }
    if (saveBtn) saveBtn.disabled = true;
    setTokenHint('正在验证令牌…', true);
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${value}`,
          Accept: 'application/vnd.github+json'
        }
      });
      if (response.status === 401) {
        throw new Error('令牌无效或已被吊销（401），请重新生成。');
      }
      if (!response.ok) {
        throw new Error(`GitHub 返回 ${response.status}，请稍后重试。`);
      }
      auth.saveToken(value);
      setTokenHint('验证通过，已保存到本机。', true);
      const status = $('tokenStatus');
      if (status && typeof auth.tokenMask === 'function') {
        status.textContent = auth.tokenMask();
      }
      refreshAuthBanner();
      await loadEntries();
      setTimeout(closeTokenModal, 600);
    } catch (error) {
      setTokenHint(error.message || String(error));
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });

  // ---------- 常规事件（全部做空值保护，避免某个 DOM 缺失导致整页中断） ----------
  on('prevMonth', 'click', () => {
    currentDate = currentDate.subtract(1, 'month');
    renderCalendar(currentDate);
  });

  on('nextMonth', 'click', () => {
    currentDate = currentDate.add(1, 'month');
    renderCalendar(currentDate);
  });

  on('newEntry', 'click', () => {
    window.location.href = `editor.html?date=${dayjs().format('YYYY-MM-DD')}`;
  });

  if (userDropdown) {
    userDropdown.addEventListener('click', () => {
      if (!userMenu) return;
      userMenu.classList.toggle('show');
      userDropdown.setAttribute(
        'aria-expanded',
        userMenu.classList.contains('show') ? 'true' : 'false'
      );
    });
  }

  on('logout', 'click', () => {
    if (confirm('确定要退出登录吗？')) {
      auth.logout();
      window.location.href = 'login.html';
    }
  });

  on('refresh', 'click', () => {
    void loadEntries();
  });

  document.addEventListener('click', (event) => {
    if (!userDropdown || !userMenu) return;
    if (!userDropdown.contains(event.target) && !userMenu.contains(event.target)) {
      userMenu.classList.remove('show');
    }
  });

  // ---------- 渲染日历 ----------
  function renderCalendar(date) {
    if (currentMonth) {
      currentMonth.textContent = `${date.year()}年${date.month() + 1}月`;
    }
    if (!calendarGrid) return;

    const calendar = utils.generateCalendar(date.year(), date.month());
    calendarGrid.innerHTML = '';

    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    weekdays.forEach((weekday) => {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-weekday';
      dayCell.textContent = weekday;
      calendarGrid.appendChild(dayCell);
    });

    calendar.forEach((day) => {
      const dayCell = document.createElement('div');
      dayCell.className = 'calendar-day';

      if (day !== null) {
        dayCell.textContent = day;
        dayCell.classList.add('calendar-day-active');
        const dayDate = dayjs(`${date.year()}-${date.month() + 1}-${day}`).format('YYYY-MM-DD');

        if (entries.some((entry) => entry.date === dayDate)) {
          dayCell.classList.add('has-entry');
        }

        dayCell.addEventListener('click', () => {
          window.location.href = `editor.html?date=${dayDate}`;
        });
      }

      calendarGrid.appendChild(dayCell);
    });
  }

  // ---------- 加载记忆条目 ----------
  async function loadEntries() {
    try {
      safeShowLoading('加载记忆中...');
      if (entriesContainer) {
        entriesContainer.innerHTML = '<div class="loading">加载记忆中...</div>';
      }
      entries = await storage.getEntries();

      if (!entries.length) {
        if (entriesContainer) {
          entriesContainer.innerHTML = '<div class="empty">还没有记忆，开始写第一篇吧！</div>';
        }
        return;
      }

      if (entriesContainer) entriesContainer.innerHTML = '';
      const showEntries = entries.slice(0, 3);

      showEntries.forEach((entry) => {
        const entryEl = document.createElement('div');
        entryEl.className = 'entry-item';
        entryEl.innerHTML = `
          <div class="entry-main">
            <div class="entry-date">${utils.formatDate(entry.date, 'YYYY年MM月DD日')}</div>
            <div class="entry-snippet">加载中...</div>
          </div>
          <div class="entry-actions">
            <button class="entry-delete-btn" title="删除记忆" data-date="${entry.date}">
              &#128465;
            </button>
          </div>
        `;

        // 预览走同源静态文件，失败只影响这一条，不抛未处理的 rejection
        fetch(entry.url)
          .then((response) => (response.ok ? response.text() : ''))
          .then((text) => {
            const snippet = entryEl.querySelector('.entry-snippet');
            if (!snippet) return;
            const div = document.createElement('div');
            div.innerHTML = text;
            let html = div.innerHTML;
            if (html.length > 300) html = html.substring(0, 300) + '...';
            snippet.innerHTML = html;
          })
          .catch(() => {
            const snippet = entryEl.querySelector('.entry-snippet');
            if (snippet) snippet.textContent = '预览不可用';
          });

        entryEl.addEventListener('click', () => {
          window.location.href = `editor.html?date=${entry.date}`;
        });

        const deleteBtn = entryEl.querySelector('.entry-delete-btn');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            const date = event.currentTarget.getAttribute('data-date');
            if (!confirm('确定要删除这篇记忆吗？删除后无法恢复！')) return;
            try {
              safeShowLoading('正在删除...');
              await storage.deleteEntry(date);
              alert('删除成功！');
              await loadEntries();
            } catch (error) {
              if (error && (error.code === 'AUTH_REQUIRED' || error.code === 'TOKEN_INVALID')) {
                showBanner(error.message, true);
                openTokenModal();
              } else {
                alert('删除失败：' + (error.message || error));
              }
            } finally {
              safeHideLoading();
            }
          });
        }

        if (entriesContainer) entriesContainer.appendChild(entryEl);
      });

      if (entries.length > 3 && entriesContainer) {
        const moreBtn = document.createElement('button');
        moreBtn.className = 'btn btn-link entries-more-btn';
        moreBtn.textContent = '更多回忆';
        moreBtn.onclick = () => {
          window.location.href = 'all.html';
        };
        entriesContainer.appendChild(moreBtn);
      }
    } catch (error) {
      const message = utils.escapeHtml(error.message || String(error));
      if (entriesContainer) {
        entriesContainer.innerHTML = `<div class="error">加载失败：${message}<br><button type="button" id="retryLoad" class="btn-link">重试</button></div>`;
        const retry = $('retryLoad');
        if (retry) retry.addEventListener('click', () => void loadEntries());
      }
      console.error('加载记忆错误:', error);
    } finally {
      safeHideLoading();
      renderCalendar(currentDate);
    }
  }

  // ---------- 启动 ----------
  refreshAuthBanner();
  renderCalendar(currentDate);
  await loadEntries();
  void verifyTokenSilently();
});
