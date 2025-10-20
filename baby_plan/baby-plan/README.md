# 宝贝计划项目

## 项目描述
宝贝计划是一个温馨友好的网页应用，旨在帮助用户管理孕期相关的任务和记录。该应用包含孕周数显示、药物打卡记录、日历和任务管理功能，旨在为准妈妈提供便利和支持。

## 文件结构
```
baby-plan
├── src
│   ├── index.html          # 应用的主页面
│   ├── med-checkin.html    # 药物打卡记录页面
│   ├── calendar.html       # 日历页面
│   ├── tasks.html          # 任务管理页面
│   ├── settings.html       # 设置页面
│   ├── components
│   │   ├── week-display.html  # 孕周数显示组件
│   │   ├── med-tracker.html    # 药物打卡记录组件
│   │   ├── calendar-widget.html # 日历组件
│   │   └── task-manager.html    # 任务管理组件
│   ├── assets
│   │   ├── css
│   │   │   ├── base.css        # 基础样式
│   │   │   ├── theme.css       # 主题样式
│   │   │   └── components.css   # 组件样式
│   │   └── js
│   │       ├── app.js          # 主脚本文件
│   │       ├── weeks.js        # 孕周数计算逻辑
│   │       ├── meds.js         # 药物打卡记录逻辑
│   │       ├── calendar.js      # 日历功能逻辑
│   │       ├── tasks.js        # 任务管理逻辑
│   │       └── storage.js      # 数据存储处理
│   └── lib
│       └── dayjs.min.js       # 日期处理库
├── package.json               # npm配置文件
├── .gitignore                 # 版本控制忽略文件
└── README.md                  # 项目文档
```

## 安装与使用
1. 克隆项目到本地：
   ```
   git clone <repository-url>
   ```
2. 进入项目目录：
   ```
   cd baby-plan
   ```
3. 安装依赖：
   ```
   npm install
   ```
4. 启动应用：
   ```
   npm start
   ```

## 功能概述
- **孕周数显示**：计算并展示从2025年9月7日开始的孕周数。
- **药物打卡记录**：用户可以记录每日的药物补充情况。
- **日历功能**：用户可以选择日期并查看该日期的任务和打卡记录。
- **任务管理**：用户可以添加、删除、编辑和查看任务。

## 贡献
欢迎任何形式的贡献！请提交问题或拉取请求。

## 许可证
本项目采用 MIT 许可证。