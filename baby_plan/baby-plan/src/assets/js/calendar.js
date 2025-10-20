// This file implements the logic for the calendar functionality, allowing users to select dates and view tasks and check-in records.

document.addEventListener('DOMContentLoaded', async () => {
  // 获取必要的 DOM 元素
  const calendarEl = document.querySelector('.calendar tbody');
  const currentMonthEl = document.getElementById('current-month');
  const prevMonthBtn = document.getElementById('prev-month');
  const nextMonthBtn = document.getElementById('next-month');
  const pregnancyOverviewEl = document.getElementById('pregnancy-overview');

  // 检查必要的 DOM 元素是否存在
  if (!calendarEl || !currentMonthEl || !prevMonthBtn || !nextMonthBtn || !pregnancyOverviewEl) {
    console.error('未找到必要的 DOM 元素');
    return;
  }

  let currentDate = new Date();

  // 渲染日历
  async function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // 更新月份显示
    currentMonthEl.textContent = `${year}年${month + 1}月`;
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // 计算需要显示的日期范围
    const firstDayWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    let html = '';
    let currentWeek = '';
    
    // 添加月初的空白格子
    for (let i = 0; i < firstDayWeek; i++) {
      currentWeek += '<td></td>';
    }
    
    // 添加日期
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayStatus = await getDayStatus(dateStr);
      
      currentWeek += `
        <td>
          <span class="date-cell ${dayStatus}" data-date="${dateStr}">
            ${day}
          </span>
        </td>
      `;
      
      // 一周结束或月末，添加行
      if ((firstDayWeek + day) % 7 === 0 || day === daysInMonth) {
        html += `<tr>${currentWeek}</tr>`;
        currentWeek = '';
      }
    }
    
    calendarEl.innerHTML = html;

    // 更新孕周信息
    await renderPregnancyOverview(date);
  }

  // 上个月按钮点击事件
  prevMonthBtn.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1);
    renderCalendar(currentDate);
  });

  // 下个月按钮点击事件
  nextMonthBtn.addEventListener('click', () => {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1);
    renderCalendar(currentDate);
  });

  // 初始化
  await renderCalendar(currentDate);
});