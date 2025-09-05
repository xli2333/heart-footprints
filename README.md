# 心迹地图 (Our Footprints) 💕

> 专属于你们的私密时光空间 - 用心记录，用爱连接

## 🌟 项目简介

心迹地图是一个专为异地情侣打造的私密网站，通过记录日常点滴、共享地理位置和珍藏回忆，拉近彼此心的距离。这不仅仅是一个技术项目，更是一个维系感情的数字纽带。

## ✨ 核心功能

### 🔐 我们的暗号
- 双密码认证系统，无需注册
- 自动识别用户身份
- 安全的 JWT 会话管理

### 📍 今日之约
- 每日定位同步与距离计算
- 心情表情记录
- 地图可视化展示
- 历史距离图表

### 📸 时光相册
- 共同记忆画廊
- 瀑布流布局
- 图片描述与时间戳
- 沉浸式查看体验

### ⏰ 倒数日
- 重要日期倒计时
- 自定义背景图片
- 动态时间更新

### 💌 时光信札
- 异步情感信件
- 定时发送功能
- 未读提醒

## 🛠️ 技术栈

### 前端
- **框架**: Next.js 14 (App Router)
- **样式**: Tailwind CSS + 自定义温暖日记主题
- **动画**: Framer Motion
- **状态管理**: Zustand
- **数据请求**: SWR
- **图标**: Lucide React

### 后端
- **平台**: Supabase (PostgreSQL + Auth + Storage)
- **认证**: JWT + HttpOnly Cookies
- **API**: Next.js API Routes

### 部署
- **前端**: Vercel
- **数据库**: Supabase
- **地图服务**: Mapbox

## 🚀 快速开始

### 1. 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd heart-footprints

# 安装依赖
npm install
```

### 2. 环境配置

复制环境变量模板并填入你的配置：

```bash
cp .env.example .env.local
```

在 `.env.local` 中填入以下配置：

```env
# 我们的暗号
USER_HIM_PASSWORD=你的密码
USER_HER_PASSWORD=她的密码
USER_HIM_NAME=你的昵称
USER_HER_NAME=她的昵称

# JWT 密钥（使用强随机字符串）
JWT_SECRET=your_very_long_and_random_jwt_secret

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Mapbox Token
NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token
```

### 3. 数据库设置

1. 在 [Supabase](https://supabase.com) 创建新项目
2. 进入 SQL Editor
3. 执行 `supabase/migrations/001_initial_schema.sql` 中的内容
4. 创建两个存储桶：`memories` 和 `backgrounds`

### 4. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看网站。

## 🎨 设计理念

### 温暖日记美学
- **色彩**: 米白背景 + 豆沙红主题色
- **字体**: 思源宋体（标题）+ Inter/苹方（正文）
- **风格**: 极简留白 + 情感共鸣 + 细节惊喜

### 用户体验原则
- **直觉易用**: 零学习成本
- **情感连接**: 每个交互都服务于情感表达
- **丝滑体验**: 精心设计的微交互和动画

## 📁 项目结构

```
heart-footprints/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   ├── dashboard/         # 主页面
│   ├── login/            # 登录页面
│   ├── globals.css       # 全局样式
│   └── layout.tsx        # 根布局
├── components/           # React 组件
├── lib/                 # 工具函数
│   ├── auth.ts         # 认证相关
│   ├── supabase.ts     # Supabase 客户端
│   └── utils.ts        # 通用工具
├── types/              # TypeScript 类型定义
├── supabase/          # 数据库迁移文件
├── public/            # 静态资源
└── 项目规划文档/       # 详细的项目设计文档
```

## 🚧 开发进度

- [x] 项目基础架构
- [x] 用户认证系统
- [x] 数据库结构设计
- [ ] 今日之约模块
- [ ] 时光相册模块
- [ ] 倒数日功能
- [ ] 时光信札功能
- [ ] UI/UX 精细化
- [ ] 部署上线

## 📖 详细文档

项目包含完整的设计文档：

- `项目整体规划.md` - 产品概述与功能规划
- `项目计划.md` - 详细的设计与技术蓝图

## 🔧 开发说明

### 核心组件开发指南
1. 所有组件都应遵循"温暖日记"设计风格
2. 使用 Framer Motion 实现丝滑动画效果
3. 优先考虑用户的情感体验
4. 保持代码的简洁和可维护性

### 数据库操作
- 使用 Supabase 客户端进行数据库操作
- 所有敏感操作都在服务端进行
- 充分利用 PostgreSQL 的高级功能

### 安全考虑
- 使用 HttpOnly Cookies 存储认证信息
- 环境变量严格保密
- 实施行级安全策略 (RLS)

## 💝 致谢

这个项目承载着两个人的美好感情，希望它能成为你们爱情故事中的一个特殊章节。

愿你们的爱情像这个项目一样，用心经营，历久弥新。

---

*用心记录，用爱连接* ✨

---

**LXG (理想工匠)** - 专注于将感性想法转化为精致产品的数字工匠