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
  const taskList = document.getElementById('task-list');
  const taskDialog = document.getElementById('task-dialog');
  const taskForm = document.getElementById('task-form');
  const addTaskBtn = document.getElementById('add-task');
  
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
            ${task.notes ? `<div class="task-notes">备注: ${task.notes}</div>` : ''}
          </div>
          <div class="task-actions">
            <button class="edit-task" data-id="${task.id || ''}">编辑</button>
            <button class="delete-task" data-id="${task.id || ''}">删除</button>
          </div>
        `;
        taskList.appendChild(div);
      });
    } catch (error) {
      console.error('渲染任务失败:', error);
      taskList.innerHTML = `
        <div style="text-align:center;padding:20px;color:#ff4444">
          加载失败: ${error.message}<br>
          <button onclick="location.reload()">重试</button>
        </div>
      `;
    }
  }

  // 表单提交处理
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(taskForm);
    const editingId = taskForm.dataset.editingId;

    try {
      const currentTasks = await window.BabyStorage.getTasks();
      let updatedTasks;

      if (editingId) {
        // 编辑现有任务
        updatedTasks = currentTasks.map(task => 
          task.id === editingId ? {
            ...task,
            name: formData.get('name'),
            dose: formData.get('dose'),
            notes: formData.get('notes'),
            updatedAt: new Date().toISOString()
          } : task
        );
      } else {
        // 添加新任务
        const newTask = {
          id: 't_' + Date.now(),
          name: formData.get('name'),
          dose: formData.get('dose'),
          notes: formData.get('notes'),
          createdAt: new Date().toISOString()
        };
        updatedTasks = [...currentTasks, newTask];
      }

      await window.BabyStorage.saveTasks(updatedTasks);
      taskDialog.close();
      taskForm.reset();
      delete taskForm.dataset.editingId;
      await renderTasks();
    } catch (error) {
      alert('保存失败: ' + error.message);
    }
  });

  // 处理任务列表的点击事件
  taskList.addEventListener('click', async (e) => {
    const target = e.target;
    
    // 处理编辑按钮点击
    if (target.classList.contains('edit-task')) {
      const taskId = target.dataset.id;
      const tasks = await window.BabyStorage.getTasks();
      const task = tasks.find(t => t.id === taskId);
      
      if (task) {
        document.getElementById('task-name').value = task.name || '';
        document.getElementById('task-dose').value = task.dose || '';
        document.getElementById('task-notes').value = task.notes || '';
        taskForm.dataset.editingId = taskId;
        taskDialog.showModal();
      }
    }
    
    // 处理删除按钮点击
    if (target.classList.contains('delete-task')) {
      const taskId = target.dataset.id;
      if (confirm('确定要删除这个任务吗？')) {
        try {
          const tasks = await window.BabyStorage.getTasks();
          const updatedTasks = tasks.filter(t => t.id !== taskId);
          await window.BabyStorage.saveTasks(updatedTasks);
          await renderTasks();
        } catch (error) {
          alert('删除失败: ' + error.message);
        }
      }
    }
  });

  // 添加任务按钮点击事件
  addTaskBtn.addEventListener('click', () => {
    taskForm.reset();
    delete taskForm.dataset.editingId;
    taskDialog.showModal();
  });

  // 初始化加载
  await renderTasks();
});