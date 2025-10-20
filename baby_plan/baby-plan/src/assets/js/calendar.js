// This file implements the logic for the calendar functionality, allowing users to select dates and view tasks and check-in records.

document.addEventListener('DOMContentLoaded', () => {
    let currentDate = new Date();
    const calendarDays = document.getElementById('calendar-days');
    const currentMonthEl = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    function renderPregnancyOverview() {
        const info = window.BabyWeeks.getPregnancyInfo(currentDate);
        const el = document.getElementById('pregnancy-overview');
        el.innerHTML = `
            <div style="text-align:center;padding:1rem;">
                <div style="font-size:1.2rem;font-weight:600;color:#c85a90;">
                    当前：${info.display}
                </div>
                <div style="margin-top:6px;color:#7a4b66;">
                    ${info.trimester} · 预计开始：${info.startDate}
                </div>
            </div>
        `;
    }

    function getMonthData(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startPadding = firstDay.getDay();
        const daysInMonth = lastDay.getDate();
        
        return { startPadding, daysInMonth };
    }

    async function getDayStatus(dateStr) {
        try {
            const [tasks, records] = await Promise.all([
                window.BabyStorage.getTasks(),
                window.BabyStorage.getRecords(dateStr)
            ]);
            
            if(!tasks.length || !Object.keys(records).length) return 'empty';
            
            const total = tasks.length;
            const completed = Object.values(records).filter(r => r.done).length;
            
            if(completed === 0) return 'none';
            if(completed === total) return 'complete';
            return 'partial';
        } catch (error) {
            console.error('获取状态失败:', error);
            return 'error';
        }
    }

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const today = new Date();
        
        currentMonthEl.textContent = `${year}年 ${month + 1}月`;
        
        const { startPadding, daysInMonth } = getMonthData(year, month);
        
        calendarDays.innerHTML = '';
        
        // Empty cells for padding
        for(let i = 0; i < startPadding; i++) {
            calendarDays.appendChild(document.createElement('div'));
        }
        
        // Days of month
        for(let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const status = getDayStatus(dateStr);
            
            if(status === 'complete') cell.classList.add('with-records');
            if(status === 'partial') cell.classList.add('incomplete');
            
            if(year === today.getFullYear() && 
               month === today.getMonth() && 
               day === today.getDate()) {
                cell.classList.add('today');
            }
            
            cell.innerHTML = `
                <span class="date">${day}</span>
                ${status !== 'empty' ? `<span class="indicator">${
                    status === 'complete' ? '✓' : 
                    status === 'partial' ? '⚠️' : '✗'
                }</span>` : ''}
            `;
            
            cell.addEventListener('click', () => {
                window.location.href = `med-checkin.html?date=${dateStr}`;
            });
            
            calendarDays.appendChild(cell);
        }
    }
    
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
        renderPregnancyOverview();
    });
    
    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
        renderPregnancyOverview();
    });
    
    // Initialize
    renderCalendar();
    renderPregnancyOverview();
    
    // Handle URL params
    const params = new URLSearchParams(window.location.search);
    if(params.has('date')) {
        currentDate = new Date(params.get('date'));
        renderCalendar();
        renderPregnancyOverview();
    }
});