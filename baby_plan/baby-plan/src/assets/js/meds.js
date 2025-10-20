// This file handles the logic for medication check-in records, including adding, viewing, and managing medication entries.

const meds = [];

// Function to add a medication entry
function addMedEntry(date, medication, dosage) {
    const entry = {
        date: date,
        medication: medication,
        dosage: dosage,
        id: Date.now() // Unique ID based on timestamp
    };
    meds.push(entry);
    saveMeds();
}

// Function to get all medication entries
function getMedEntries() {
    return meds;
}

// Function to delete a medication entry by ID
function deleteMedEntry(id) {
    const index = meds.findIndex(entry => entry.id === id);
    if (index !== -1) {
        meds.splice(index, 1);
        saveMeds();
    }
}

// Function to save medication entries to local storage
function saveMeds() {
    localStorage.setItem('meds', JSON.stringify(meds));
}

// Function to load medication entries from local storage
function loadMeds() {
    const storedMeds = localStorage.getItem('meds');
    if (storedMeds) {
        const parsedMeds = JSON.parse(storedMeds);
        parsedMeds.forEach(entry => meds.push(entry));
    }
}

/*
  med-checkin 页面逻辑：
  - 在选定日期（默认今天）下显示所有任务及当天完成状态
  - 支持新增任务、删除、编辑名称/剂量（简单内联编辑）、打卡完成/取消、添加备注
  - 状态颜色：已完成（绿色），未完成（红色）
*/
document.addEventListener('DOMContentLoaded', async () => {
  const medRecordsEl = document.getElementById('med-records');
  const dateInput = document.getElementById('selected-date');
  const pregWeekEl = document.getElementById('preg-week');
  const pregTrimEl = document.getElementById('preg-trimester');

  // 设置默认日期为今天
  const todayStr = new Date().toISOString().split('T')[0];
  dateInput.value = todayStr;

  async function renderPregnancyInfo(dateStr) {
    try {
      const info = await window.BabyWeeks.getPregnancyInfo(new Date(dateStr));
      pregWeekEl.textContent = `当前：${info.display || '0周'}`;
      pregTrimEl.textContent = `${info.trimester || '未开始'} · 开始日期：${info.startDate || '未设置'}`;
    } catch (error) {
      console.error('渲染孕周信息失败:', error);
      pregWeekEl.textContent = '当前：加载失败';
      pregTrimEl.textContent = '请检查设置';
    }
  }

  async function renderTasksFor(dateStr) {
    medRecordsEl.innerHTML = '<div style="text-align:center;padding:20px;">加载中...</div>';
    
    try {
      const [tasks, records] = await Promise.all([
        window.BabyStorage.getTasks(),
        window.BabyStorage.getRecords(dateStr)
      ]);

      if (!tasks || tasks.length === 0) {
        medRecordsEl.innerHTML = `
          <div style="text-align:center;padding:20px;color:#666;">
            暂无任务，请在任务管理页面添加
          </div>
        `;
        return;
      }

      medRecordsEl.innerHTML = '';
      tasks.forEach(task => {
        const rec = records[task.id] || { done: false, note: '' };
        const row = document.createElement('div');
        row.className = `med-row ${rec.done ? 'done' : ''}`;
        
        row.innerHTML = `
          <div class="task-info">
            <div class="task-name">${task.name}</div>
            ${task.dose ? `<div class="task-dose">剂量：${task.dose}</div>` : ''}
            ${task.notes ? `<div class="task-notes">备注：${task.notes}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="checkbox" ${rec.done ? 'checked' : ''}>
          </div>
        `;

        const checkbox = row.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', async (e) => {
          try {
            await window.BabyStorage.saveRecord(dateStr, task.id, {
              done: e.target.checked,
              note: rec.note
            });
            row.className = `med-row ${e.target.checked ? 'done' : ''}`;
          } catch (error) {
            alert('保存失败: ' + error.message);
            e.target.checked = !e.target.checked;
          }
        });

        medRecordsEl.appendChild(row);
      });
    } catch (error) {
      console.error('渲染失败:', error);
      medRecordsEl.innerHTML = `
        <div style="text-align:center;padding:20px;color:#ff4444">
          加载失败: ${error.message}<br>
          <button onclick="location.reload()" style="margin-top:10px;padding:5px 10px">重试</button>
        </div>
      `;
    }
  }

  // 日期切换事件
  dateInput.addEventListener('change', async (e) => {
    const d = e.target.value;
    if (!d) return;
    await renderTasksFor(d);
    renderPregnancyInfo(d);
  });

  // 初始化加载
  await renderTasksFor(dateInput.value);
  renderPregnancyInfo(dateInput.value);
});

// Load medication entries on script initialization
loadMeds();