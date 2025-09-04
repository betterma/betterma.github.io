// sleep.js - 睡眠统计主逻辑
document.addEventListener('DOMContentLoaded', async function() {
    // 全局变量
    let sleepRecords = [];
    let sleepChart = null;
    let comparisonChart = null;
    let bedTimeChart = null;
    let currentChartType = 'duration';
    let currentTimeRange = 'all';
    let currentComparisonRange = 'all';
    let currentBedTimeRange = 'all';
    
    // DOM引用
    const addSleepRecordBtn = document.getElementById('addSleepRecord');
    const modal = document.getElementById('addRecordModal');
    const closeBtn = document.querySelector('.close');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('sleepRecordForm');
    const refreshBtn = document.getElementById('refresh');
    const exportBtn = document.getElementById('exportData');
    const chartTypeSelect = document.getElementById('chartType');
    const timeRangeSelect = document.getElementById('timeRange');
    const comparisonTimeRangeSelect = document.getElementById('comparisonTimeRange');
    const bedTimeRangeSelect = document.getElementById('bedTimeRange');
    
    // 初始化
    await initializeApp();
    
    // 事件监听器
    addSleepRecordBtn.addEventListener('click', () => {
        showModal();
        setDefaultDate();
    });
    
    closeBtn.addEventListener('click', hideModal);
    cancelBtn.addEventListener('click', hideModal);
    
    // 点击模态框外部关闭
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideModal();
        }
    });
    
    form.addEventListener('submit', handleFormSubmit);
    refreshBtn.addEventListener('click', refreshData);
    exportBtn.addEventListener('click', exportData);
    
    chartTypeSelect.addEventListener('change', (e) => {
        currentChartType = e.target.value;
        updateChart();
    });
    
    timeRangeSelect.addEventListener('change', (e) => {
        currentTimeRange = e.target.value;
        updateChart();
    });
    
    comparisonTimeRangeSelect.addEventListener('change', (e) => {
        currentComparisonRange = e.target.value;
        updateComparisonChart();
    });
    
    bedTimeRangeSelect.addEventListener('change', (e) => {
        currentBedTimeRange = e.target.value;
        updateBedTimeChart();
    });
    
    // 窗口大小变化时重新调整图表
    window.addEventListener('resize', () => {
        if (sleepChart) {
            sleepChart.resize();
        }
        if (comparisonChart) {
            comparisonChart.resize();
        }
        if (bedTimeChart) {
            bedTimeChart.resize();
        }
    });
    
    // 初始化应用
    async function initializeApp() {
        try {
            showLoading('加载睡眠数据...');
            await loadSleepData();
            updateStats();
            updateChart();
            updateComparisonChart();
            updateBedTimeChart();
            updateRecentRecords();
        } catch (error) {
            console.error('初始化失败:', error);
            showError('加载数据失败，请检查网络连接');
        } finally {
            hideLoading();
        }
    }
    
    // 加载睡眠数据
    async function loadSleepData() {
        try {
            sleepRecords = await storage.getSleepRecords();
            
            // 如果没有数据，添加一些示例数据
            if (sleepRecords.length === 0) {
                await addSampleData();
                sleepRecords = await storage.getSleepRecords();
            }
            
            console.log('加载的睡眠记录:', sleepRecords);
        } catch (error) {
            console.error('加载睡眠数据失败:', error);
            sleepRecords = [];
        }
    }
    
    // 添加示例数据
    async function addSampleData() {
        const sampleRecords = [
            {
                date: '2025-08-31',
                bedTime: '22:00',
                sleepTime: '22:30',
                wakeTime: '06:00',
                sleepDuration: 7.5,
                sleepTimeHour: 22.5,
                wakeTimeHour: 6.0,
                bedTimeHour: 22.0,
                notes: '早睡早起，精神很好'
            },
            {
                date: '2025-09-01',
                bedTime: '23:30',
                sleepTime: '00:00',
                wakeTime: '08:00',
                sleepDuration: 8.0,
                sleepTimeHour: 0.0,
                wakeTimeHour: 8.0,
                bedTimeHour: 23.5,
                notes: '周末睡得比较晚，但睡眠质量不错'
            },
            {
                date: '2025-09-02',
                bedTime: '22:30',
                sleepTime: '23:00',
                wakeTime: '06:30',
                sleepDuration: 7.5,
                sleepTimeHour: 23.0,
                wakeTimeHour: 6.5,
                bedTimeHour: 22.5,
                notes: '早睡早起，感觉不错'
            },
            {
                date: '2025-09-03',
                bedTime: '23:00',
                sleepTime: '23:30',
                wakeTime: '07:30',
                sleepDuration: 8.0,
                sleepTimeHour: 23.5,
                wakeTimeHour: 7.5,
                bedTimeHour: 23.0,
                notes: '睡眠质量很好，早上精神饱满'
            }
        ];
        
        for (const record of sampleRecords) {
            await storage.saveSleepRecord(record.date, record);
        }
    }
    
    // 更新统计信息
    function updateStats() {
        const stats = calculateStats();
        
        document.getElementById('avgSleepDuration').textContent = 
            stats.avgSleepDuration.toFixed(1);
        document.getElementById('avgSleepTime').textContent = 
            formatHour(stats.avgSleepTime);
        document.getElementById('avgWakeTime').textContent = 
            formatHour(stats.avgWakeTime);
        document.getElementById('avgBedTime').textContent = 
            formatHour(stats.avgBedTime);
        document.getElementById('totalDays').textContent = 
            stats.totalDays;
    }
    
    // 计算统计数据
    function calculateStats() {
        if (sleepRecords.length === 0) {
            return {
                totalDays: 0,
                avgSleepDuration: 0,
                avgSleepTime: 0,
                avgWakeTime: 0,
                avgBedTime: 0
            };
        }
        
        let totalSleepHours = 0;
        let totalSleepTime = 0;
        let totalWakeTime = 0;
        let totalBedTime = 0;
        let validRecords = 0;
        let bedTimeCount = 0;
        
        sleepRecords.forEach(record => {
            if (record.sleepDuration) {
                totalSleepHours += record.sleepDuration;
                validRecords++;
            }
            if (record.sleepTimeHour) {
                totalSleepTime += record.sleepTimeHour;
            }
            if (record.wakeTimeHour) {
                totalWakeTime += record.wakeTimeHour;
            }
            if (record.bedTime) {
                const bedTimeHour = parseTimeToHour(record.bedTime);
                totalBedTime += bedTimeHour;
                bedTimeCount++;
            }
        });
        
        return {
            totalDays: sleepRecords.length,
            avgSleepDuration: validRecords > 0 ? totalSleepHours / validRecords : 0,
            avgSleepTime: sleepRecords.length > 0 ? totalSleepTime / sleepRecords.length : 0,
            avgWakeTime: sleepRecords.length > 0 ? totalWakeTime / sleepRecords.length : 0,
            avgBedTime: bedTimeCount > 0 ? totalBedTime / bedTimeCount : 0
        };
    }
    
    // 更新图表
    function updateChart() {
        const filteredRecords = filterRecordsByTimeRange();
        const chartData = prepareChartData(filteredRecords);
        
        if (sleepChart) {
            sleepChart.dispose();
        }
        
        sleepChart = echarts.init(document.getElementById('sleepChart'));
        sleepChart.setOption({
            title: {
                text: getChartTitle(),
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'normal'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: [getChartTitle()],
                top: 30
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData.labels,
                axisLabel: {
                    formatter: function(value) {
                        return dayjs(value).format('MM/DD');
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: getYAxisLabel(),
                nameLocation: 'middle',
                nameGap: 30
            },
            series: [{
                name: getChartTitle(),
                type: 'line',
                data: chartData.data,
                smooth: true,
                lineStyle: {
                    color: '#667eea',
                    width: 3
                },
                itemStyle: {
                    color: '#667eea'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0, color: 'rgba(102, 126, 234, 0.3)'
                        }, {
                            offset: 1, color: 'rgba(102, 126, 234, 0.1)'
                        }]
                    }
                }
            }]
        });
    }
    
    // 根据时间范围过滤记录
    function filterRecordsByTimeRange() {
        if (currentTimeRange === 'all') {
            return sleepRecords;
        }
        
        const days = parseInt(currentTimeRange);
        const cutoffDate = dayjs().subtract(days, 'day');
        
        return sleepRecords.filter(record => {
            return dayjs(record.date).isAfter(cutoffDate);
        });
    }
    
    // 通用时间范围过滤函数
    function filterRecordsByRange(range) {
        if (range === 'all') {
            return sleepRecords;
        }
        
        const days = parseInt(range);
        const cutoffDate = dayjs().subtract(days, 'day');
        
        return sleepRecords.filter(record => {
            return dayjs(record.date).isAfter(cutoffDate);
        });
    }
    
    // 准备图表数据
    function prepareChartData(records) {
        const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        const labels = sortedRecords.map(record => record.date);
        let data = [];
        let label = '';
        
        switch (currentChartType) {
            case 'duration':
                data = sortedRecords.map(record => record.sleepDuration || 0);
                label = '睡眠时长 (小时)';
                break;
            case 'sleepTime':
                data = sortedRecords.map(record => record.sleepTimeHour || 0);
                label = '入睡时间 (24小时制)';
                break;
            case 'wakeTime':
                data = sortedRecords.map(record => record.wakeTimeHour || 0);
                label = '起床时间 (24小时制)';
                break;
            case 'efficiency':
                data = sortedRecords.map(record => calculateSleepEfficiency(record));
                label = '睡眠效率 (%)';
                break;
        }
        
        return {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        };
    }
    
    // 准备对比图表数据
    function prepareComparisonChartData(records) {
        const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(a.date));
        
        const labels = sortedRecords.map(record => record.date);
        
        return {
            labels: labels,
            datasets: [
                {
                    label: '上床时间',
                    data: sortedRecords.map(record => record.bedTime ? parseTimeToHour(record.bedTime) : null),
                    borderColor: '#ff6b6b',
                    backgroundColor: 'rgba(255, 107, 107, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#ff6b6b',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: '入睡时间',
                    data: sortedRecords.map(record => record.sleepTime ? parseTimeToHour(record.sleepTime) : null),
                    borderColor: '#4ecdc4',
                    backgroundColor: 'rgba(78, 205, 196, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#4ecdc4',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    yAxisID: 'y'
                },
                {
                    label: '起床时间',
                    data: sortedRecords.map(record => record.wakeTime ? parseTimeToHour(record.wakeTime) : null),
                    borderColor: '#45b7d1',
                    backgroundColor: 'rgba(69, 183, 209, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4,
                    pointBackgroundColor: '#45b7d1',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    yAxisID: 'y'
                }
            ]
        };
    }
    
    // 准备上床时间图表数据
    function prepareBedTimeChartData(records) {
        const sortedRecords = records.sort((a, b) => new Date(a.date) - new Date(a.date));
        
        const labels = sortedRecords.map(record => record.date);
        const bedTimes = sortedRecords.map(record => {
            if (!record.bedTime) return null;
            const hour = parseTimeToHour(record.bedTime);
            // 将24小时制转换为更易读的格式（比如23:30显示为23.5）
            return hour;
        });
        
        return {
            labels: labels,
            datasets: [{
                label: '上床时间',
                data: bedTimes,
                borderColor: '#ff6b6b',
                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ff6b6b',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        };
    }
    
    // 计算睡眠效率
    function calculateSleepEfficiency(record) {
        if (!record.bedTime || !record.sleepTime || !record.wakeTime) {
            return 0;
        }
        
        const bedToSleep = getTimeDifference(record.bedTime, record.sleepTime);
        const sleepToWake = getTimeDifference(record.sleepTime, record.wakeTime);
        
        if (sleepToWake === 0) return 0;
        
        const efficiency = (sleepToWake / (bedToSleep + sleepToWake)) * 100;
        return Math.round(efficiency);
    }
    
    // 获取Y轴标签
    function getYAxisLabel() {
        switch (currentChartType) {
            case 'duration': return '小时';
            case 'sleepTime': return '时间 (24小时制)';
            case 'wakeTime': return '时间 (24小时制)';
            case 'efficiency': return '百分比 (%)';
            default: return '';
        }
    }
    
    // 获取图表标题
    function getChartTitle() {
        switch (currentChartType) {
            case 'duration': return '睡眠时长趋势';
            case 'sleepTime': return '入睡时间趋势';
            case 'wakeTime': return '起床时间趋势';
            case 'efficiency': return '睡眠效率趋势';
            default: return '睡眠趋势';
        }
    }
    
    // 更新对比图表
    function updateComparisonChart() {
        const filteredRecords = filterRecordsByRange(currentComparisonRange);
        const chartData = prepareComparisonChartData(filteredRecords);
        
        if (comparisonChart) {
            comparisonChart.dispose();
        }
        
        comparisonChart = echarts.init(document.getElementById('comparisonChart'));
        comparisonChart.setOption({
            title: {
                text: '睡眠时间对比分析',
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'normal'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: ['上床时间', '入睡时间', '起床时间'],
                top: 30
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData.labels,
                axisLabel: {
                    formatter: function(value) {
                        return dayjs(value).format('MM/DD');
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '时间 (24小时制)',
                nameLocation: 'middle',
                nameGap: 30
            },
            series: [
                {
                    name: '上床时间',
                    type: 'line',
                    data: chartData.datasets[0].data,
                    smooth: true,
                    lineStyle: { color: '#ff6b6b', width: 2 },
                    itemStyle: { color: '#ff6b6b' },
                    symbol: 'circle',
                    symbolSize: 6
                },
                {
                    name: '入睡时间',
                    type: 'line',
                    data: chartData.datasets[1].data,
                    smooth: true,
                    lineStyle: { color: '#4ecdc4', width: 2 },
                    itemStyle: { color: '#4ecdc4' },
                    symbol: 'circle',
                    symbolSize: 6
                },
                {
                    name: '起床时间',
                    type: 'line',
                    data: chartData.datasets[2].data,
                    smooth: true,
                    lineStyle: { color: '#45b7d1', width: 2 },
                    itemStyle: { color: '#45b7d1' },
                    symbol: 'circle',
                    symbolSize: 6
                }
            ]
        });
    }
    
    // 更新上床时间图表
    function updateBedTimeChart() {
        const filteredRecords = filterRecordsByRange(currentBedTimeRange);
        const chartData = prepareBedTimeChartData(filteredRecords);
        
        if (bedTimeChart) {
            bedTimeChart.dispose();
        }
        
        bedTimeChart = echarts.init(document.getElementById('bedTimeChart'));
        bedTimeChart.setOption({
            title: {
                text: '上床时间变化趋势',
                left: 'center',
                textStyle: {
                    fontSize: 16,
                    fontWeight: 'normal'
                }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'cross'
                }
            },
            legend: {
                data: ['上床时间'],
                top: 30
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '3%',
                top: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: chartData.labels,
                axisLabel: {
                    formatter: function(value) {
                        return dayjs(value).format('MM/DD');
                    }
                }
            },
            yAxis: {
                type: 'value',
                name: '上床时间 (24小时制)',
                nameLocation: 'middle',
                nameGap: 30
            },
            series: [{
                name: '上床时间',
                type: 'line',
                data: chartData.datasets[0].data,
                smooth: true,
                lineStyle: { color: '#ff6b6b', width: 3 },
                itemStyle: { color: '#ff6b6b' },
                symbol: 'circle',
                symbolSize: 8,
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0, color: 'rgba(255, 107, 107, 0.3)'
                        }, {
                            offset: 1, color: 'rgba(255, 107, 107, 0.1)'
                        }]
                    }
                }
            }]
        });
    }
    
    // 更新最近记录
    function updateRecentRecords() {
        const container = document.getElementById('recentRecordsList');
        const recentRecords = sleepRecords.slice(0, 5);
        
        if (recentRecords.length === 0) {
            container.innerHTML = '<div class="empty">还没有睡眠记录，开始记录吧！</div>';
            return;
        }
        
        container.innerHTML = '';
        
        recentRecords.forEach(record => {
            const recordEl = createRecordElement(record);
            container.appendChild(recordEl);
        });
    }
    
    // 创建记录元素
    function createRecordElement(record) {
        const recordEl = document.createElement('div');
        recordEl.className = 'record-item';
        
        const duration = record.sleepDuration ? `${record.sleepDuration.toFixed(1)}小时` : '未记录';
        const sleepTime = record.sleepTime ? formatTime(record.sleepTime) : '未记录';
        const wakeTime = record.wakeTime ? formatTime(record.wakeTime) : '未记录';
        
        recordEl.innerHTML = `
            <div class="record-info">
                <div class="record-date">${formatDate(record.date)}</div>
                <div class="record-details">
                    睡眠时长: ${duration} | 入睡: ${sleepTime} | 起床: ${wakeTime}
                </div>
            </div>
            <div class="record-actions">
                <button class="edit-btn" title="编辑" data-date="${record.date}">✏️</button>
                <button class="delete-btn" title="删除" data-date="${record.date}">🗑️</button>
            </div>
        `;
        
        // 绑定事件
        recordEl.querySelector('.edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            editRecord(record.date);
        });
        
        recordEl.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteRecord(record.date);
        });
        
        return recordEl;
    }
    
    // 显示模态框
    function showModal() {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    // 隐藏模态框
    function hideModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        form.reset();
    }
    
    // 设置默认日期
    function setDefaultDate() {
        const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
        document.getElementById('recordDate').value = yesterday;
    }
    
    // 处理表单提交
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const record = {
            date: formData.get('recordDate'),
            bedTime: formData.get('bedTime'),
            sleepTime: formData.get('sleepTime'),
            wakeTime: formData.get('wakeTime'),
            notes: formData.get('notes')
        };
        
        // 计算睡眠时长
        if (record.sleepTime && record.wakeTime) {
            record.sleepDuration = calculateSleepDuration(record.sleepTime, record.wakeTime);
            record.sleepTimeHour = parseTimeToHour(record.sleepTime);
            record.wakeTimeHour = parseTimeToHour(record.wakeTime);
        }
        
        try {
            showLoading('保存中...');
            await storage.saveSleepRecord(record.date, record);
            
            // 更新本地数据
            const existingIndex = sleepRecords.findIndex(r => r.date === record.date);
            if (existingIndex >= 0) {
                sleepRecords[existingIndex] = record;
            } else {
                sleepRecords.unshift(record);
            }
            
            // 重新排序
            sleepRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // 更新UI
            updateStats();
            updateChart();
            updateComparisonChart();
            updateBedTimeChart();
            updateRecentRecords();
            
            hideModal();
            showSuccess('睡眠记录保存成功！');
        } catch (error) {
            console.error('保存失败:', error);
            showError(`保存失败: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
    
    // 计算睡眠时长
    function calculateSleepDuration(sleepTime, wakeTime) {
        const sleep = parseTimeToHour(sleepTime);
        const wake = parseTimeToHour(wakeTime);
        
        let duration = wake - sleep;
        if (duration <= 0) {
            duration += 24; // 跨天的情况
        }
        
        return duration;
    }
    
    // 解析时间为小时数
    function parseTimeToHour(timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours + minutes / 60;
    }
    
    // 获取时间差
    function getTimeDifference(time1, time2) {
        const hour1 = parseTimeToHour(time1);
        const hour2 = parseTimeToHour(time2);
        
        let diff = hour2 - hour1;
        if (diff < 0) diff += 24;
        
        return diff;
    }
    
    // 编辑记录
    function editRecord(date) {
        const record = sleepRecords.find(r => r.date === date);
        if (!record) return;
        
        // 填充表单
        document.getElementById('recordDate').value = record.date;
        document.getElementById('bedTime').value = record.bedTime || '';
        document.getElementById('sleepTime').value = record.sleepTime || '';
        document.getElementById('wakeTime').value = record.wakeTime || '';
        document.getElementById('notes').value = record.notes || '';
        
        showModal();
    }
    
    // 删除记录
    async function deleteRecord(date) {
        if (!confirm('确定要删除这条睡眠记录吗？删除后无法恢复！')) {
            return;
        }
        
        try {
            showLoading('删除中...');
            await storage.deleteSleepRecord(date);
            
            // 更新本地数据
            sleepRecords = sleepRecords.filter(r => r.date !== date);
            
            // 更新UI
            updateStats();
            updateChart();
            updateComparisonChart();
            updateBedTimeChart();
            updateRecentRecords();
            
            showSuccess('记录删除成功！');
        } catch (error) {
            console.error('删除失败:', error);
            showError(`删除失败: ${error.message}`);
        } finally {
            hideLoading();
        }
    }
    
    // 刷新数据
    async function refreshData() {
        try {
            showLoading('刷新数据中...');
            await loadSleepData();
            updateStats();
            updateChart();
            updateComparisonChart();
            updateBedTimeChart();
            updateRecentRecords();
            showSuccess('数据刷新成功！');
        } catch (error) {
            console.error('刷新失败:', error);
            showError('刷新失败，请稍后重试');
        } finally {
            hideLoading();
        }
    }
    
    // 导出数据
    function exportData() {
        if (sleepRecords.length === 0) {
            showError('没有数据可导出');
            return;
        }
        
        const csvContent = convertToCSV(sleepRecords);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `睡眠记录_${dayjs().format('YYYY-MM-DD')}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
    
    // 转换为CSV格式
    function convertToCSV(records) {
        const headers = ['日期', '上床时间', '睡着时间', '起床时间', '睡眠时长(小时)', '备注'];
        const rows = records.map(record => [
            record.date,
            record.bedTime || '',
            record.sleepTime || '',
            record.wakeTime || '',
            record.sleepDuration ? record.sleepDuration.toFixed(1) : '',
            record.notes || ''
        ]);
        
        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }
    
    // 工具函数
    function formatDate(dateStr) {
        return dayjs(dateStr).format('YYYY年MM月DD日');
    }
    
    function formatTime(timeStr) {
        if (!timeStr) return '';
        const [hours, minutes] = timeStr.split(':');
        return `${hours}:${minutes}`;
    }
    
    function formatHour(hour) {
        if (hour === undefined || hour === null) return '--';
        return Math.round(hour);
    }
    
    function showLoading(text) {
        const loading = document.getElementById('globalLoading');
        const loadingText = document.getElementById('loadingText');
        loadingText.textContent = text;
        loading.style.display = 'flex';
    }
    
    function hideLoading() {
        document.getElementById('globalLoading').style.display = 'none';
    }
    
    function showSuccess(message) {
        // 简单的成功提示，可以替换为更美观的toast
        alert(message);
    }
    
    function showError(message) {
        // 简单的错误提示，可以替换为更美观的toast
        alert(message);
    }
});
