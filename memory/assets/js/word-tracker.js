const STORAGE_KEY = 'wordTrackerRecords';

function parseWords(input) {
  if (!input) return [];
  return input
    .split(/[,\n\s]+/)
    .map(word => word.trim())
    .filter(Boolean);
}

function getRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('读取记录失败', error);
    return [];
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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

function getHighlightLevel(count) {
  if (count >= 4) return 4;
  if (count >= 3) return 3;
  if (count >= 2) return 2;
  if (count >= 1) return 1;
  return 0;
}

function renderStats(records) {
  const statsList = document.getElementById('statsList');
  const frequencyMap = buildFrequencyMap(records);
  const sorted = [...frequencyMap.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  if (!sorted.length) {
    statsList.innerHTML = '<div class="empty-state">暂时还没有统计结果。</div>';
    return;
  }

  statsList.innerHTML = sorted
    .map(([word, count]) => {
      const level = getHighlightLevel(count);
      const color = ['#f3f4f6', '#dbeafe', '#bfdbfe', '#93c5fd', '#2563eb'][level];
      return `<div class="stat-chip" style="background:${color};">${word} × ${count}</div>`;
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
      const columnWords = items.map(word => {
        const lower = word.toLowerCase();
        const count = previousFrequencyMap.get(lower) || 0;
        const isRepeated = count > 0;
        return `<li class="${isRepeated ? 'highlight' : ''}">${word} <span>（此前出现 ${count} 次）</span></li>`;
      });

      return `
        <div class="history-column">
          <div class="history-column-header">
            <span>第 ${index + 1} 组</span>
          </div>
          <ul>${columnWords.join('')}</ul>
          <div class="history-column-footer">
            <button class="delete-column-btn" data-index="${index}">删除这一列</button>
          </div>
        </div>
      `;
    })
    .join('');

  historyGrid.querySelectorAll('.delete-column-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.getAttribute('data-index'));
      const next = records.filter((_, itemIndex) => itemIndex !== idx);
      saveRecords(next);
      render(next);
    });
  });
}

function render(records) {
  renderStats(records);
  renderHistory(records);
}

function handleSave() {
  const input = document.getElementById('wordInput').value;
  const words = parseWords(input);
  if (!words.length) {
    alert('请先输入至少一个单词');
    return;
  }

  const records = getRecords();
  records.push(words);
  saveRecords(records);
  document.getElementById('wordInput').value = '';
  render(records);
}

function bindEvents() {
  document.getElementById('saveBtn').addEventListener('click', handleSave);
  document.getElementById('clearInputBtn').addEventListener('click', () => {
    document.getElementById('wordInput').value = '';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  render(getRecords());
});
