// This file contains the logic for calculating the current pregnancy weeks based on a start date.

const startDate = new Date('2025-09-07'); // Start date of pregnancy
const today = new Date(); // Current date

function calculateWeeks() {
    const diffTime = Math.abs(today - startDate); // Difference in milliseconds
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Convert to days
    return Math.floor(diffDays / 7); // Convert to weeks
}

function displayWeeks() {
    const weeks = calculateWeeks();
    const weekDisplayElement = document.getElementById('week-display'); // Assuming there's an element with this ID
    if (weekDisplayElement) {
        weekDisplayElement.textContent = `当前孕周数: ${weeks} 周`;
    }
}

// Call the display function to show the weeks on page load
document.addEventListener('DOMContentLoaded', displayWeeks);

/*
  孕周计算工具
  - 默认起始日：从 meta.startDate（storage）读取，若无则使用 2025-09-07
  - 返回：{ weeks: N, days: M, display: "N周+M天", trimester: "孕早期|孕中期|孕晚期", progress: 0.0 }
*/
(function(global){
  function parseDateISO(d){
    if(!d) return null;
    return new Date(d + 'T00:00:00');
  }
  function daysBetween(start, end){
    const msPerDay = 24*60*60*1000;
    return Math.floor((end - start) / msPerDay);
  }
  async function getPregnancyInfo(referenceDate = new Date()) {
    // 获取开始日期
    let startDate = '2025-09-07';
    try {
      const meta = await window.BabyStorage.getMeta();
      startDate = meta.startDate || startDate;
    } catch (error) {
      console.error('获取设置失败:', error);
    }

    // 确保日期对象正确
    const start = new Date(startDate + 'T00:00:00');
    const ref = new Date(referenceDate);
    ref.setHours(0, 0, 0, 0);

    console.log('日期计算:', {
      startDate,
      start: start.toISOString(),
      ref: ref.toISOString()
    });

    // 计算天数差
    const msPerDay = 24 * 60 * 60 * 1000;
    const deltaDays = Math.floor((ref - start) / msPerDay);
    
    // 计算周数和天数
    const weeks = Math.floor(deltaDays / 7) + 1;
    const days = deltaDays % 7;

    console.log('计算结果:', {
      deltaDays,
      weeks,
      days
    });

    // 确定孕期阶段
    let trimester = '未开始';
    if (weeks >= 1 && weeks <= 13) {
      trimester = '孕早期';
    } else if (weeks >= 14 && weeks <= 27) {
      trimester = '孕中期';
    } else if (weeks >= 28) {
      trimester = '孕晚期';
    }

    return {
      weeks,
      days,
      display: `${weeks}周${days ? '+' + days + '天' : ''}`,
      trimester,
      progress: Math.min(1, weeks / 40),
      startDate
    };
  }

  global.BabyWeeks = { getPregnancyInfo };
})(window);