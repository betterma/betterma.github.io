function parseWords(input) {
  if (!input) return [];
  return input
    .split(/[\s,.;，。？！；：()（）【】「」“”‘’]+/)
    .map(word => word.trim())
    .filter(Boolean);
}

function getHueForWord(word) {
  let hash = 0;
  for (let i = 0; i < word.length; i += 1) {
    hash = (hash * 31 + word.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % 360;
}

function getWordStyle(word) {
  const hue = getHueForWord(word.toLowerCase());
  return `background:hsl(${hue}, 72%, 90%); border-color:hsl(${hue}, 72%, 78%);`;
}

function buildFrequencyMap(records) {
  const map = new Map();
  records.forEach(items => {
    items.forEach(word => {
      const lower = word.toLowerCase();
      map.set(lower, (map.get(lower) || 0) + 1);
    });
  });
  return map;
}

function buildPreviousFrequencyMap(records, currentIndex) {
  const map = new Map();
  for (let i = 0; i < currentIndex; i += 1) {
    records[i].forEach(word => {
      const lower = word.toLowerCase();
      map.set(lower, (map.get(lower) || 0) + 1);
    });
  }
  return map;
}

function renderStats(records) {
  const statsList = document.getElementById('statsList');
  const frequencyMap = buildFrequencyMap(records);
  const sorted = [...frequencyMap.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  if (!sorted.length) {
    statsList.innerHTML = '<div class="empty-state">暂时还没有统计结果。</div>';
    return;
  }

  statsList.innerHTML = sorted
    .map(([word, count]) => {
      return `<div class="stat-chip" style="${getWordStyle(word)}">${word} × ${count}</div>`;
    })
    .join('');
}

function renderHistory(records) {
  const historyGrid = document.getElementById('historyGrid');

  if (!records.length) {
    historyGrid.innerHTML = '<div class="empty-state">还没有任何保存记录，先添加一组吧。</div>';
    return;
  }

  historyGrid.innerHTML = records
    .map((items, index) => {
      const previousFrequencyMap = buildPreviousFrequencyMap(records, index);
      const wordChips = items.map(word => {
        const lower = word.toLowerCase();
        const isRepeated = previousFrequencyMap.get(lower) > 0;
        return `<li class="word-chip${isRepeated ? ' highlight' : ''}" style="${getWordStyle(lower)}">${word}</li>`;
      });

      return `
        <div class="history-column">
          <div class="history-column-header">
            <span>第 ${index + 1} 组</span>
          </div>
          <ul class="word-chip-list">${wordChips.join('')}</ul>
          <div class="history-column-footer">
            <button class="delete-column-btn" data-index="${index}">删除这一列</button>
          </div>
        </div>
      `;
    })
    .join('');

  historyGrid.querySelectorAll('.delete-column-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.getAttribute('data-index'));
      const records = await storage.getRecords();
      const next = records.filter((_, itemIndex) => itemIndex !== idx);
      await storage.saveRecords(next);
      render(next);
    });
  });
}

async function render(records) {
  renderStats(records);
  renderHistory(records);
}

async function handleSave() {
  const input = document.getElementById('wordInput').value;
  const words = parseWords(input);
  if (!words.length) {
    alert('请先输入至少一个标的');
    return;
  }

  const deduped = [];
  const seen = new Set();
  words.forEach(word => {
    const lower = word.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      deduped.push(word);
    }
  });

  if (!deduped.length) {
    alert('本次保存的标的已全部重复，请输入新的内容');
    return;
  }

  try {
    const records = await storage.getRecords();
    records.push(deduped);
    await storage.saveRecords(records);
    document.getElementById('wordInput').value = '';
    render(records);
  } catch (error) {
    alert('保存失败，请检查网络或 GitHub API 设置。');
    console.error(error);
  }
}

function bindEvents() {
  document.getElementById('saveBtn').addEventListener('click', handleSave);
  document.getElementById('clearInputBtn').addEventListener('click', () => {
    document.getElementById('wordInput').value = '';
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  try {
    const records = await storage.getRecords();
    render(records);
  } catch (error) {
    document.getElementById('historyGrid').innerHTML = '<div class="empty-state">加载记录失败，请检查网络。</div>';
    document.getElementById('statsList').innerHTML = '<div class="empty-state">加载统计失败。</div>';
    console.error(error);
  }
});