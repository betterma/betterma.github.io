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
  
  let editingTaskId = null;

  // 确保 DOM 元素存在
  if (!taskList || !taskDialog || !taskForm || !addTaskBtn) {
    console.error('必要的 DOM 元素未找到');
    return;
  }

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
            <button class="edit-task" data-id="${task.id}">编辑</button>
            <button class="delete-task" data-id="${task.id}">删除</button>
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

  // 添加任务事件监听
  addTaskBtn.addEventListener('click', () => {
    editingTaskId = null;
    taskDialog.showModal();
  });

  // 表单提交处理
  taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(taskForm);
    const taskData = {
      name: formData.get('name'),
      dose: formData.get('dose'),
      notes: formData.get('notes')
    };

    try {
      await window.BabyStorage.saveTasks(taskData);
      taskDialog.close();
      await renderTasks();
      taskForm.reset();
    } catch (error) {
      alert('保存失败: ' + error.message);
    }
  });

  // 初始化加载
  await renderTasks();
});