// 主脚本文件，负责初始化和管理应用的整体逻辑

// 导入所需的模块
import { calculateWeeks } from './weeks.js';
import { initMedTracker } from './meds.js';
import { initCalendar } from './calendar.js';
import { initTaskManager } from './tasks.js';

// 初始化应用
function initApp() {
    // 计算当前孕周数并显示
    const weeks = calculateWeeks(new Date('2025-09-07'));
    document.getElementById('week-display').innerText = `当前孕周数: ${weeks} 周`;

    // 初始化药物打卡记录
    initMedTracker();

    // 初始化日历功能
    initCalendar();

    // 初始化任务管理功能
    initTaskManager();
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);