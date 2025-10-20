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
  const medForm = document.getElementById('med-form');
  const nameInput = document.getElementById('med-name');
  const doseInput = document.getElementById('med-dose');
  const dateInput = document.getElementById('selected-date');
  const pregWeekEl = document.getElementById('preg-week');
  const pregTrimEl = document.getElementById('preg-trimester');

  // 默认今日
  function toISODate(d){
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  const todayStr = toISODate(new Date());
  dateInput.value = todayStr;

  function renderPregnancyInfo(dateStr){
    const ref = new Date(dateStr + 'T00:00:00');
    const info = window.BabyWeeks.getPregnancyInfo(ref);
    pregWeekEl.textContent = `当前：${info.display}`;
    pregTrimEl.textContent = `${info.trimester} · 预计开始：${info.startDate}`;
  }

  async function renderTasksFor(dateStr) {
    medRecordsEl.innerHTML = '';
    try {
      const [tasks, records] = await Promise.all([
        window.BabyStorage.getTasks(),
        window.BabyStorage.getRecords(dateStr)
      ]);

      if(tasks.length === 0){
        const no = document.createElement('div');
        no.style.color = '#777';
        no.style.padding = '10px';
        no.style.textAlign = 'center';
        no.textContent = '还没有添加任务，使用下方表单添加药物或补充项目。';
        medRecordsEl.appendChild(no);
        return;
      }

      tasks.forEach(task => {
        const rec = records[task.id] || { done: false, note: '' };
        const row = document.createElement('div');
        row.className = 'med-row';
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';
        row.style.padding = '10px';
        row.style.borderRadius = '12px';
        row.style.boxShadow = '0 4px 10px rgba(200,120,160,0.06)';
        row.style.background = rec.done ? '#eefaf0' : '#fff7f7';
        row.style.border = rec.done ? '1px solid #cde9d6' : '1px solid #ffd6d6';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.flexDirection = 'column';
        left.style.flex = '1';
        left.style.marginRight = '12px';

        const title = document.createElement('div');
        title.textContent = `${task.name} ${task.dose ? '- ' + task.dose : ''}`;
        title.style.fontWeight = '600';
        title.style.color = '#44324a';

        const note = document.createElement('div');
        note.textContent = task.notes || '';
        note.style.fontSize = '0.9rem';
        note.style.color = '#6b5666';
        note.style.marginTop = '6px';

        left.appendChild(title);
        if(task.notes) left.appendChild(note);

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.alignItems = 'center';
        right.style.gap = '8px';

        const noteBtn = document.createElement('button');
        noteBtn.textContent = '备注';
        noteBtn.style.padding = '6px 8px';
        noteBtn.style.borderRadius = '8px';
        noteBtn.style.border = 'none';
        noteBtn.style.background = '#f2d9e6';
        noteBtn.style.cursor = 'pointer';
        noteBtn.addEventListener('click', () => {
          const newNote = prompt('备注：', rec.note || task.notes || '');
          if(newNote !== null){
            // 保存到记录注释中
            window.BabyStorage.toggleTaskRecord(dateStr, task.id, !!rec.done, newNote);
            renderTasksFor(dateStr);
          }
        });

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = !!rec.done;
        checkbox.style.width = '20px';
        checkbox.style.height = '20px';
        checkbox.addEventListener('change', (e) => {
          const done = e.target.checked;
          window.BabyStorage.toggleTaskRecord(dateStr, task.id, done, rec.note || '');
          renderTasksFor(dateStr);
        });

        const editBtn = document.createElement('button');
        editBtn.textContent = '编辑';
        editBtn.style.padding = '6px 8px';
        editBtn.style.borderRadius = '8px';
        editBtn.style.border = 'none';
        editBtn.style.background = '#ffdede';
        editBtn.style.cursor = 'pointer';
        editBtn.addEventListener('click', () => {
          const newName = prompt('任务名称：', task.name);
          if(newName === null) return;
          const newDose = prompt('剂量：', task.dose || '');
          if(newDose === null) return;
          const newNotes = prompt('任务备注（可选）：', task.notes || '');
          const updated = Object.assign({}, task, { name: newName, dose: newDose, notes: newNotes });
          window.BabyStorage.updateTask(updated);
          renderTasksFor(dateStr);
        });

        const delBtn = document.createElement('button');
        delBtn.textContent = '删除';
        delBtn.style.padding = '6px 8px';
        delBtn.style.borderRadius = '8px';
        delBtn.style.border = 'none';
        delBtn.style.background = '#ffe7e7';
        delBtn.style.cursor = 'pointer';
        delBtn.addEventListener('click', () => {
          if(confirm('确认删除该任务？')) {
            window.BabyStorage.deleteTask(task.id);
            // 同步删除当天记录中的该任务键
            const recs = window.BabyStorage.getRecordForDate(dateStr);
            if(recs[task.id]) { delete recs[task.id]; window.BabyStorage.setRecordForDate(dateStr, recs); }
            renderTasksFor(dateStr);
          }
        });

        right.appendChild(checkbox);
        right.appendChild(noteBtn);
        right.appendChild(editBtn);
        right.appendChild(delBtn);

        row.appendChild(left);
        row.appendChild(right);
        medRecordsEl.appendChild(row);
      });
    } catch (error) {
      console.error('加载任务失败:', error);
      medRecordsEl.innerHTML = '<div class="error">加载失败,请稍后重试</div>';
    }
  }

  // 修改表单提交为异步
  medForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const task = {
        name: nameInput.value.trim(),
        dose: doseInput.value.trim()
      };
      await window.BabyStorage.saveTasks(task);
      nameInput.value = '';
      doseInput.value = '';
      await renderTasksFor(dateInput.value);
    } catch (error) {
      alert('保存失败: ' + error.message);
    }
  });

  // 日期切换
  dateInput.addEventListener('change', (e) => {
    const d = e.target.value;
    if(!d) return;
    renderPregnancyInfo(d);
    renderTasksFor(d);
  });

  // 首次渲染
  renderPregnancyInfo(dateInput.value || todayStr);
  renderTasksFor(dateInput.value || todayStr);
});

// Load medication entries on script initialization
loadMeds();