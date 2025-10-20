// This file contains the logic for managing tasks, including adding, deleting, editing, and viewing tasks.

const tasks = [];

// Function to add a new task
function addTask(task) {
    tasks.push(task);
    saveTasks();
}

// Function to delete a task by index
function deleteTask(index) {
    if (index > -1 && index < tasks.length) {
        tasks.splice(index, 1);
        saveTasks();
    }
}

// Function to edit a task by index
function editTask(index, updatedTask) {
    if (index > -1 && index < tasks.length) {
        tasks[index] = updatedTask;
        saveTasks();
    }
}

// Function to get all tasks
function getTasks() {
    return tasks;
}

// Function to save tasks to local storage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Function to load tasks from local storage
function loadTasks() {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
        tasks.push(...JSON.parse(storedTasks));
    }
}

// Load tasks when the script is executed
loadTasks();

document.addEventListener('DOMContentLoaded', async () => {
  const taskList = document.querySelector('.task-list');
  const taskDialog = document.getElementById('task-dialog');
  const taskForm = document.getElementById('task-form');
  const importExportDialog = document.getElementById('import-export-dialog');
  
  let editingTaskId = null;

  // 渲染任务列表
  async function renderTasks() {
    taskList.innerHTML = '<div style="text-align:center;padding:20px;">加载中...</div>';
    
    try {
      const tasks = await window.BabyStorage.getTasks();
      console.log('获取到的任务:', tasks);
      
      if (!tasks || tasks.length === 0) {
        taskList.innerHTML = `
          <div style="text-align:center;padding:30px;color:#666;">
            还没有添加任务，点击"新增任务"开始添加
          </div>
        `;
        return;
      }

      taskList.innerHTML = '';
      tasks.forEach(task => {
        const div = document.createElement('div');
        div.className = 'task-item';
        div.innerHTML = `
          <div class="task-info">
            <div class="task-name">${task.name || ''}</div>
            ${task.dose ? `<div class="task-dose">剂量: ${task.dose}</div>` : ''}
            ${task.notes ? `<div class="task-notes">${task.notes}</div>` : ''}
          </div>
          <div class="task-actions">
            <button class="secondary-btn edit-task" data-id="${task.id}">编辑</button>
            <button class="danger-btn delete-task" data-id="${task.id}">删除</button>
          </div>
        `;
        taskList.appendChild(div);
      });
    } catch (error) {
      console.error('渲染任务失败:', error);
      taskList.innerHTML = `
        <div style="text-align:center;padding:20px;color:#ff4444">
          加载失败: ${error.message}<br>
          <button onclick="location.reload()" style="margin-top:10px;padding:5px 10px">重试</button>
        </div>
      `;
    }
  }

    // 打开新增/编辑对话框
    function openTaskDialog(task = null) {
        const nameInput = document.getElementById('task-name');
        const doseInput = document.getElementById('task-dose');
        const notesInput = document.getElementById('task-notes');
        
        if(task) {
            editingTaskId = task.id;
            nameInput.value = task.name;
            doseInput.value = task.dose || '';
            notesInput.value = task.notes || '';
        } else {
            editingTaskId = null;
            nameInput.value = '';
            doseInput.value = '';
            notesInput.value = '';
        }
        
        taskDialog.showModal();
    }

    // 事件监听
    document.getElementById('add-task').addEventListener('click', () => {
        openTaskDialog();
    });

    document.getElementById('import-export').addEventListener('click', () => {
        importExportDialog.showModal();
    });

    // 修改表单提交为异步
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const task = {
                name: document.getElementById('task-name').value.trim(),
                dose: document.getElementById('task-dose').value.trim(),
                notes: document.getElementById('task-notes').value.trim()
            };
            
            if(editingTaskId) {
                task.id = editingTaskId;
                await window.BabyStorage.updateTask(task);
            } else {
                await window.BabyStorage.saveTasks(task);
            }
            
            taskDialog.close();
            await renderTasks();
        } catch (error) {
            alert('保存失败: ' + error.message);
        }
    });

    taskList.addEventListener('click', (e) => {
        if(e.target.classList.contains('edit-task')) {
            const id = e.target.dataset.id;
            const task = window.BabyStorage.getTasks().find(t => t.id === id);
            if(task) openTaskDialog(task);
        }
        
        if(e.target.classList.contains('delete-task')) {
            const id = e.target.dataset.id;
            if(confirm('确定要删除这个任务吗？')) {
                window.BabyStorage.deleteTask(id);
                renderTasks();
            }
        }
    });

    // 导入/导出功能
    document.getElementById('export-btn').addEventListener('click', () => {
        const tasks = window.BabyStorage.getTasks();
        const records = window.BabyStorage.getRecords();
        const data = { tasks, records };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `babyplan-backup-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    document.getElementById('import-btn').addEventListener('click', () => {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        if(!file) return alert('请先选择文件');
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if(data.tasks) {
                    window.BabyStorage.saveTasks(data.tasks);
                }
                if(data.records) {
                    window.BabyStorage.saveRecords(data.records);
                }
                alert('数据导入成功');
                renderTasks();
            } catch(err) {
                alert('导入失败: ' + err.message);
            }
        };
        reader.readAsText(file);
    });

    // 初始化
    await renderTasks();
});