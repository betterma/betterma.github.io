// storage.js - 睡眠数据存储管理模块
const storage = (function() {
    // 私有方法
    async function request(endpoint, options = {}) {
      // 使用公开的GitHub API，不需要认证
      const GITHUB_USERNAME = 'betterma';
      const GITHUB_REPO = 'mazha';
      
      const url = `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/${endpoint}`;
      
      try {
        const response = await fetch(`${url}?t=${Date.now()}`, {
          ...options,
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            ...(options.headers || {})
          }
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || `GitHub API错误：${response.status}`);
        }
        
        return response.json();
      } catch (error) {
        console.error('GitHub存储错误:', error);
        throw error;
      }
    }
    
    // 公共接口
    return {
             // 保存睡眠记录
       saveSleepRecord: async function(date, record) {
         try {
           // 使用本地存储
           const records = JSON.parse(localStorage.getItem('sleepRecords') || '{}');
           records[date] = record;
           localStorage.setItem('sleepRecords', JSON.stringify(records));
           return { success: true };
         } catch (error) {
           console.error('保存睡眠记录失败:', error);
           throw error;
         }
       },
      
             // 获取睡眠记录
       getSleepRecord: async function(date) {
         try {
           const records = JSON.parse(localStorage.getItem('sleepRecords') || '{}');
           return records[date] || null;
         } catch (error) {
           console.log(`没有找到${date}的睡眠记录`);
           return null;
         }
       },
      
             // 获取所有睡眠记录
       getSleepRecords: async function() {
         try {
           const records = JSON.parse(localStorage.getItem('sleepRecords') || '{}');
           const recordsList = Object.values(records);
           return recordsList.sort((a, b) => new Date(b.date) - new Date(a.date));
         } catch (error) {
           console.error('获取睡眠记录列表失败:', error);
           return [];
         }
       },

             // 删除睡眠记录
       deleteSleepRecord: async function(date) {
         try {
           const records = JSON.parse(localStorage.getItem('sleepRecords') || '{}');
           delete records[date];
           localStorage.setItem('sleepRecords', JSON.stringify(records));
           return { success: true };
         } catch (error) {
           console.error('删除睡眠记录失败:', error);
           throw error;
         }
       },

             // 获取睡眠统计数据
       getSleepStats: async function() {
         try {
           const records = await this.getSleepRecords();
           if (records.length === 0) {
             return {
               totalDays: 0,
               avgSleepDuration: 0,
               avgSleepTime: 0,
               avgWakeTime: 0,
               avgBedTime: 0,
               totalSleepHours: 0
             };
           }

           let totalSleepHours = 0;
           let totalSleepTime = 0;
           let totalWakeTime = 0;
           let totalBedTime = 0;
           let bedTimeCount = 0;

           records.forEach(record => {
             if (record.sleepDuration) {
               totalSleepHours += record.sleepDuration;
             }
             if (record.sleepTimeHour) {
               totalSleepTime += record.sleepTimeHour;
             }
             if (record.wakeTimeHour) {
               totalWakeTime += record.wakeTimeHour;
             }
             if (record.bedTime) {
               const bedTimeHour = this.parseTimeToHour(record.bedTime);
               totalBedTime += bedTimeHour;
               bedTimeCount++;
             }
           });

           return {
             totalDays: records.length,
             avgSleepDuration: totalSleepHours / records.length,
             avgSleepTime: totalSleepTime / records.length,
             avgWakeTime: totalWakeTime / records.length,
             avgBedTime: bedTimeCount > 0 ? totalBedTime / bedTimeCount : 0,
             totalSleepHours: totalSleepHours
           };
         } catch (error) {
           console.error('获取睡眠统计失败:', error);
           return {
             totalDays: 0,
             avgSleepDuration: 0,
             avgSleepTime: 0,
             avgWakeTime: 0,
             avgBedTime: 0,
             totalSleepHours: 0
           };
         }
       },
       
       // 解析时间为小时数的辅助函数
       parseTimeToHour: function(timeStr) {
         if (!timeStr) return 0;
         const [hours, minutes] = timeStr.split(':').map(Number);
         return hours + minutes / 60;
       }
    };
  })();
