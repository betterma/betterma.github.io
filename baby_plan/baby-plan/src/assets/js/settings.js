document.addEventListener('DOMContentLoaded', async () => {
    const startDateInput = document.getElementById('pregnancy-start');
    const currentStartSpan = document.getElementById('current-start');
    const themeButtons = document.querySelectorAll('.color-btn');
    
    // 加载当前设置
    async function loadSettings() {
        try {
            const meta = await window.BabyStorage.getMeta();
            startDateInput.value = meta.startDate;
            currentStartSpan.textContent = meta.startDate;
            
            // 加载主题
            const theme = localStorage.getItem('theme') || 'pink';
            document.documentElement.setAttribute('data-theme', theme);
            themeButtons.forEach(btn => {
                if(btn.dataset.theme === theme) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        } catch (error) {
            console.error('加载设置失败:', error);
            alert('加载设置失败: ' + error.message);
        }
    }
    
    // 预产期设置
    startDateInput.addEventListener('change', async (e) => {
        const newDate = e.target.value;
        if(!newDate) return;
        
        try {
            await window.BabyStorage.setMeta({ startDate: newDate });
            currentStartSpan.textContent = newDate;
        } catch (error) {
            alert('保存失败: ' + error.message);
        }
    });
    
    // 主题切换
    themeButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const theme = btn.dataset.theme;
            const saved = await saveTheme(theme);
            if (saved) {
                themeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            } else {
                alert('主题保存失败，请重试');
            }
        });
    });
    
    // 数据管理
    document.getElementById('clear-tasks').addEventListener('click', () => {
        if(confirm('确定要清除所有任务吗？此操作不可恢复。')) {
            window.BabyStorage.saveTasks([]);
            alert('任务已清除');
        }
    });
    
    document.getElementById('clear-records').addEventListener('click', () => {
        if(confirm('确定要清除所有打卡记录吗？此操作不可恢复。')) {
            window.BabyStorage.saveRecords({});
            alert('打卡记录已清除');
        }
    });
    
    document.getElementById('clear-all').addEventListener('click', () => {
        if(confirm('确定要重置所有数据吗？此操作将清除所有任务和记录，不可恢复。')) {
            window.BabyStorage.saveTasks([]);
            window.BabyStorage.saveRecords({});
            window.BabyStorage.setMeta({ startDate: '2025-09-07' });
            localStorage.setItem('theme', 'pink');
            alert('所有数据已重置');
            loadSettings();
        }
    });
    
    // 数据导入/导出
    function handleDataExport() {
        try {
            const tasks = window.BabyStorage.getTasks();
            const records = window.BabyStorage.getRecords();
            const meta = window.BabyStorage.getMeta();
            const data = { 
                version: '1.0.0',
                exportDate: new Date().toISOString(),
                tasks, 
                records,
                meta 
            };
            
            const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `babyplan-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch(err) {
            console.error('导出失败:', err);
            alert('导出失败: ' + err.message);
        }
    }

    function handleDataImport(file) {
        if(!file) {
            alert('请选择要导入的文件');
            return;
        }
        
        if(!file.name.endsWith('.json')) {
            alert('请选择 JSON 格式的备份文件');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                
                // 版本检查
                if(!data.version) {
                    throw new Error('无效的备份文件格式');
                }
                
                // 数据验证
                if(!Array.isArray(data.tasks)) {
                    throw new Error('任务数据格式错误');
                }
                
                if(typeof data.records !== 'object') {
                    throw new Error('记录数据格式错误');
                }
                
                // 确认导入
                if(confirm(`确定导入以下数据?\n- ${data.tasks.length} 个任务\n- ${Object.keys(data.records).length} 天的记录\n此操作将覆盖当前数据。`)) {
                    window.BabyStorage.saveTasks(data.tasks);
                    window.BabyStorage.saveRecords(data.records);
                    if(data.meta) {
                        window.BabyStorage.setMeta(data.meta);
                    }
                    alert('数据导入成功');
                    loadSettings();
                }
            } catch(err) {
                console.error('导入失败:', err);
                alert('导入失败: ' + err.message);
            }
        };
        reader.onerror = () => {
            alert('文件读取失败');
        };
        reader.readAsText(file);
    }

    // 添加导入/导出按钮事件监听
    document.getElementById('export-data').addEventListener('click', handleDataExport);
    document.getElementById('import-file').addEventListener('change', (e) => {
        handleDataImport(e.target.files[0]);
    });
    
    // 初始化
    loadSettings();
    
    async function saveTheme(theme) {
        try {
            const meta = await window.BabyStorage.getMeta();
            await window.BabyStorage.setMeta({
                ...meta,
                theme
            });
            
            // 应用主题
            document.documentElement.setAttribute('data-theme', theme);
            return true;
        } catch (error) {
            console.error('保存主题失败:', error);
            return false;
        }
    }
});