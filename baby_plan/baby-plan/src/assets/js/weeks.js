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
  function getPregnancyInfo(referenceDate = new Date()){
    const meta = window.BabyStorage ? window.BabyStorage.getMeta() : { startDate: '2025-09-07' };
    const start = parseDateISO(meta.startDate);
    const ref = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
    let deltaDays = daysBetween(start, ref);
    if(deltaDays < 0) deltaDays = 0;
    const weeks = Math.floor(deltaDays / 7) + 1;
    const days = deltaDays % 7;
    const display = `${weeks}周+${days}天`;
    // 三期划分（常用）：孕早期 1-13，孕中期 14-27，孕晚期 28+
    let trimester = '未怀孕';
    if(weeks >= 1 && weeks <= 13) trimester = '孕早期';
    else if(weeks >= 14 && weeks <= 27) trimester = '孕中期';
    else if(weeks >= 28) trimester = '孕晚期';
    // 以 40 周为足月参考计算进度（上限 1）
    const progress = Math.min(1, ((weeks - 1) + days/7) / 40);
    return { weeks, days, display, trimester, progress, startDate: meta.startDate };
  }

  global.BabyWeeks = { getPregnancyInfo };
})(window);