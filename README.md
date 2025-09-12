# 💕 心迹地图 (Heart Footprints)

> 一个为相爱的人打造的私密数字空间 - 记录足迹，分享回忆，守护爱情

[![Version](https://img.shields.io/badge/version-6.0.0-pink.svg)](https://github.com/xli2333/heart-footprints)
[![Deploy](https://img.shields.io/badge/deploy-vercel-brightgreen.svg)](https://vercel.com)
[![Database](https://img.shields.io/badge/database-supabase-green.svg)](https://supabase.com)
[![Maps](https://img.shields.io/badge/maps-高德地图-red.svg)](https://lbs.amap.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## 🌟 项目简介

**心迹地图**是一个专为情侣设计的私密数字空间，帮助相爱的人记录美好时光、分享珍贵回忆。无论身处何方，这里都是你们专属的温暖小窝，见证爱情的每个珍贵瞬间。

## ✨ 核心功能

### 🔐 我们的暗号
- **双密码认证**：无需繁琐注册，用你们的专属暗号即可进入
- **智能身份识别**：系统自动识别"他"和"她"的身份
- **安全会话管理**：基于JWT的安全认证机制

### 📍 今日之约 ⭐ **v6.0 地图功能全面升级**
- **高德地图集成**：专业级地图服务，支持全球位置显示
- **跨境位置标记**：无论相隔多远，都能精准定位彼此
- **实时距离计算**：智能计算直线距离，整数显示更简洁
- **心情表情记录**：用可爱的表情分享此刻心情
- **可视化距离线**：地图上直观显示两地连线
- **历史距离统计**：历史距离数据图表分析
- **优雅错误处理**：完善的加载状态和错误提示

### 📸 时光相册
- **优化的上传体验**：上传按钮置顶，随时分享美好瞬间
- **智能图片流**：默认显示最新5张，支持折叠展开
- **社交式互动**：点赞、评论、回复，让回忆更有温度
- **精美卡片布局**：Instagram风格的信息流设计
- **沉浸式查看**：点击图片进入全屏浏览模式

### ⏰ 倒数日
- **重要日期提醒**：纪念日、生日、约会等重要时刻
- **实时倒计时**：精确到秒的动态更新
- **自定义背景**：为每个事件设置专属背景图
- **事件管理**：添加、编辑、删除倒计时事件

### 💌 时光信札
- **异步情感交流**：写信的仪式感，让表达更有仪式感
- **定时发送功能**：提前写好信件，在特定时间送达
- **对话线程**：支持回复，形成完整的对话链
- **未读提醒**：新信件到达即时通知

## 🎨 设计理念

### 🌸 温暖日记美学
- **色彩搭配**：米白纸张 + 豆沙红主色调，营造温馨氛围
- **字体选择**：LXGW文楷GB + 思源宋体，兼具美观与易读性
- **视觉风格**：极简留白设计，每个细节都充满爱意

### 💫 用户体验原则
- **零学习成本**：直觉化操作，打开即用
- **情感化设计**：每个交互都服务于情感表达
- **流畅动画**：基于Framer Motion的丝滑微交互

## 🛠️ 技术架构

### 前端技术栈
```javascript
- Next.js 14 (App Router)      // 现代React框架
- TypeScript                   // 类型安全
- Tailwind CSS                 // 原子化CSS框架
- Framer Motion               // 动画库
- SWR                         // 数据获取
- React Dropzone              // 文件上传
- Lucide React               // 图标库
- @amap/amap-jsapi-loader     // 高德地图SDK
```

### 后端服务
```javascript
- Supabase                    // BaaS平台 (生产环境)
  ├── PostgreSQL             // 关系型数据库
  ├── Row Level Security     // 行级安全策略
  ├── Storage                // 文件存储
  └── Real-time             // 实时订阅
- Mock API                   // 本地开发模式
- JWT + HttpOnly Cookies     // 认证机制
- Next.js API Routes         // API接口
- 高德地图API v2.0           // 地图服务
```

### 部署方案
```javascript
- Vercel                     // 前端托管
- Supabase Cloud            // 数据库云服务
- 高德地图开放平台           // 地图服务
- GitHub Actions            // CI/CD (可选)
```

## 🚀 快速部署

### 1. 项目克隆
```bash
git clone https://github.com/xli2333/heart-footprints.git
cd heart-footprints
npm install
```

### 2. 环境配置
创建 `.env.local` 文件：
```env
# 你们的专属暗号
USER_HIM_PASSWORD=他的密码
USER_HER_PASSWORD=她的密码
USER_HIM_NAME=他的昵称
USER_HER_NAME=她的昵称

# JWT安全密钥
JWT_SECRET=your_super_secret_jwt_key_here

# 开发模式配置
NEXT_PUBLIC_USE_MOCK_API=true  # 本地开发使用Mock API

# Supabase配置 (生产环境)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# 高德地图配置 (必需)
NEXT_PUBLIC_AMAP_KEY=your_amap_api_key
AMAP_SECURITY_CODE=your_amap_security_code
```

### 3. 获取高德地图API密钥
1. 访问 [高德地图开放平台](https://lbs.amap.com/)
2. 注册开发者账号并创建应用
3. 获取Web服务API Key和安全密钥
4. 将密钥配置到环境变量中

### 4. 数据库配置

#### 开发环境 (推荐)
默认使用Mock API，无需配置数据库，直接启动即可体验所有功能。

#### 生产环境
1. 访问 [Supabase](https://supabase.com) 创建新项目
2. 在SQL编辑器中执行 `supabase/migrations/001_initial_schema.sql`
3. 创建存储桶：`memories` 和 `backgrounds`
4. 配置行级安全策略
5. 将 `NEXT_PUBLIC_USE_MOCK_API` 设置为 `false`

### 5. 启动项目
```bash
# 开发环境 (Mock API模式)
npm run dev

# 生产构建
npm run build
npm start
```

### 6. 部署到Vercel
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/xli2333/heart-footprints)

1. 点击上方按钮或手动导入GitHub仓库
2. 配置环境变量（特别是高德地图API密钥）
3. 部署完成，享受你们的专属空间！

## 📁 项目结构

```
heart-footprints/
├── 📁 app/                    # Next.js App Router
│   ├── 📁 api/               # 后端API接口
│   │   ├── 📁 auth/         # 认证相关
│   │   ├── 📁 memories/     # 相册功能
│   │   ├── 📁 letters/      # 信札功能
│   │   ├── 📁 location/     # 定位功能
│   │   ├── 📁 countdown/    # 倒计时功能
│   │   └── 📁 mock/         # Mock API ⭐
│   ├── 📁 dashboard/        # 主页面
│   ├── 📁 login/           # 登录页面
│   └── 📄 layout.tsx        # 根布局
├── 📁 components/           # React组件
│   ├── 📄 MemoryGallery.tsx    # 时光相册
│   ├── 📄 TodaysConnection.tsx # 今日之约
│   ├── 📄 LocationMap.tsx      # 地图组件 ⭐
│   ├── 📄 CountdownTimer.tsx   # 倒数日
│   ├── 📄 LetterBox.tsx        # 时光信札
│   └── 📁 ui/                  # 基础UI组件
├── 📁 lib/                 # 工具库
│   ├── 📄 supabase.ts      # 数据库客户端
│   ├── 📄 mock-data.ts     # Mock数据 ⭐
│   ├── 📄 api-config.ts    # API配置 ⭐
│   ├── 📄 auth-context.tsx # 认证上下文
│   └── 📄 utils.ts         # 通用工具
├── 📁 types/              # TypeScript类型
├── 📁 supabase/          # 数据库迁移
├── 📁 public/            # 静态资源
│   └── 📁 fonts/         # LXGW文楷字体 ⭐
└── 📄 next.config.js     # Next.js配置
```

## 🎯 版本历程

### v6.0 (当前版本) - 地图功能全面升级 🗺️
- ✨ **高德地图集成**：专业级地图服务，支持全球位置展示
- 🌍 **跨境位置显示**：支持中美等跨境位置标记和距离计算
- 🔧 **API配置优化**：完善的Mock API开发模式
- 🎨 **距离显示优化**：改为整数显示，提升可读性
- 🛠️ **技术架构升级**：解决SSR兼容性，优化错误处理
- 📱 **移动端适配**：完善的响应式地图显示

### v5.2 - 地图功能初始集成
- 🗺️ 初步集成高德地图位置显示功能
- 🔧 修复构建和部署相关问题

### v5.1 - 三项重要优化升级
- 🎨 界面和字体优化
- 📊 历史距离查看功能
- 📝 隐私保护优化

### v5.0 - 相册体验大升级
- ✨ **上传按钮优化**：移至相册顶部，提升使用便利性
- 🗂️ **智能折叠**：默认显示最新5张，支持展开查看全部
- 🎨 **界面优化**：更流畅的动画和更好的视觉层次
- 🐛 **体验改进**：解决长列表滚动问题

### v4.5 - 对话系统完善
- 🔧 修复对话线程数据获取问题
- 💬 实现完整流式信件对话历史
- 🎨 现代化回信界面设计

### v4.0-4.4 - 信札功能完善
- 💌 完整的信件收发系统
- 🗨️ 支持对话线程和回复
- 📱 响应式界面适配

## 🔧 开发指南

### 核心设计原则
1. **用户体验优先**：每个功能都要服务于情感表达
2. **性能与美观并重**：既要快速响应，也要视觉愉悦  
3. **安全性保障**：保护用户隐私和数据安全
4. **扩展性考虑**：为未来功能扩展预留空间

### 开发模式说明
#### Mock API 模式 (推荐开发使用)
- 🚀 **快速启动**：无需配置数据库，即开即用
- 🧪 **完整功能**：包含所有功能的模拟数据
- 🔄 **热重载友好**：支持数据修改和测试
- 📍 **地图测试**：预设北京-纽约测试数据

#### 生产模式
- 🔗 **真实数据库**：连接Supabase生产环境
- 🌐 **完整功能**：所有功能完全可用
- 🔒 **数据持久化**：真实的数据存储

### 代码规范
- 使用TypeScript确保类型安全
- 遵循React Hooks最佳实践
- 组件化开发，复用性优先
- 响应式设计，移动端友好

### 贡献指南
欢迎提出建议和改进意见！请通过Issue或Pull Request参与项目。

## 🛡️ 安全性

- **认证机制**：基于JWT的无状态认证
- **数据加密**：敏感信息加密存储
- **行级安全**：Supabase RLS策略保护数据
- **环境隔离**：生产环境变量严格管理
- **地图API安全**：支持安全密钥配置

## 📝 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 💝 致谢

这个项目诞生于对美好爱情的向往和对技术的热爱。希望它能成为你们爱情故事中的一个特殊章节，记录下每一个珍贵的瞬间。

特别感谢：
- [高德地图开放平台](https://lbs.amap.com/) 提供专业地图服务
- [LXGW文楷](https://github.com/lxgw/LxgwWenKai) 提供优美中文字体
- 所有为开源社区做出贡献的开发者们

愿所有相爱的人都能拥有属于自己的温暖空间。💕

---

**用心记录，用爱连接** ✨

*Built with 💕 by L*

---

### 🔗 相关链接

- [📚 项目文档](https://github.com/xli2333/heart-footprints/wiki)
- [🐛 问题反馈](https://github.com/xli2333/heart-footprints/issues)
- [💬 讨论区](https://github.com/xli2333/heart-footprints/discussions)
- [🗺️ 高德地图API文档](https://lbs.amap.com/api/javascript-api-v2/guide/abc/load)

### 🌟 如果这个项目对你有帮助，请给一个Star！⭐