document.addEventListener('DOMContentLoaded', async function () {
  if (!auth.isAuthenticated()) {
    window.location.href = 'login.html';
    return;
  }

  const form = document.getElementById('bookmarkForm');
  const titleInput = document.getElementById('bookmarkTitle');
  const urlInput = document.getElementById('bookmarkUrl');
  const formTitle = document.getElementById('formTitle');
  const submitBtn = document.getElementById('submitBtn');
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  const statusMessage = document.getElementById('statusMessage');
  const bookmarkList = document.getElementById('bookmarkList');

  let editingId = null;
  let bookmarks = [];

  function setStatus(message, type = '') {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type}`.trim();
  }

  function renderList() {
    if (!bookmarks.length) {
      bookmarkList.innerHTML = '<div class="empty">暂无备忘，先添加一个吧。</div>';
      return;
    }

    const items = bookmarks.map(item => `
      <li class="item">
        <div>
          <div class="item-title"><a href="${item.url}" target="_blank" rel="noopener noreferrer">${item.title}</a></div>
          <div class="item-url">${item.url}</div>
        </div>
        <div class="item-actions">
          <button class="edit-btn" data-id="${item.id}" type="button">编辑</button>
          <button class="delete-btn" data-id="${item.id}" type="button">删除</button>
        </div>
      </li>
    `).join('');

    bookmarkList.innerHTML = `<ul class="list">${items}</ul>`;
  }

  function resetForm() {
    form.reset();
    editingId = null;
    formTitle.textContent = '新增备忘';
    submitBtn.textContent = '保存';
    cancelEditBtn.style.display = 'none';
  }

  async function loadBookmarks() {
    try {
      setStatus('正在加载数据…');
      const data = await storage.getFile('memory/bookmarks.json');
      const parsed = data.content ? JSON.parse(data.content) : [];
      bookmarks = Array.isArray(parsed) ? parsed : [];
      renderList();
      setStatus('数据加载完成', 'success');
    } catch (error) {
      console.error(error);
      setStatus('加载失败，请稍后重试。', 'error');
    }
  }

  async function saveBookmarks() {
    const content = JSON.stringify(bookmarks, null, 2);
    await storage.saveFile('memory/bookmarks.json', content);
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();

    if (!title || !url) {
      setStatus('标题和链接不能为空。', 'error');
      return;
    }

    try {
      if (editingId) {
        bookmarks = bookmarks.map(item => item.id === editingId ? { ...item, title, url } : item);
        setStatus('更新成功', 'success');
      } else {
        bookmarks.unshift({
          id: Date.now().toString(),
          title,
          url
        });
        setStatus('新增成功', 'success');
      }

      await saveBookmarks();
      renderList();
      resetForm();
    } catch (error) {
      console.error(error);
      setStatus('保存失败，请稍后重试。', 'error');
    }
  });

  cancelEditBtn.addEventListener('click', resetForm);

  bookmarkList.addEventListener('click', async function (event) {
    const target = event.target;
    const id = target.getAttribute('data-id');
    if (!id) return;

    if (target.classList.contains('delete-btn')) {
      if (!confirm('确定要删除这条备忘吗？')) return;
      bookmarks = bookmarks.filter(item => item.id !== id);
      try {
        await saveBookmarks();
        renderList();
        setStatus('删除成功', 'success');
        if (editingId === id) resetForm();
      } catch (error) {
        console.error(error);
        setStatus('删除失败，请稍后重试。', 'error');
      }
      return;
    }

    if (target.classList.contains('edit-btn')) {
      const item = bookmarks.find(entry => entry.id === id);
      if (!item) return;
      editingId = id;
      titleInput.value = item.title;
      urlInput.value = item.url;
      formTitle.textContent = '编辑备忘';
      submitBtn.textContent = '更新';
      cancelEditBtn.style.display = 'inline-block';
      titleInput.focus();
      setStatus('正在编辑备忘', 'success');
    }
  });

  await loadBookmarks();
});
