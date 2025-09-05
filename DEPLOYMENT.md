# 🚀 部署指南 - 心迹地图上线

> 这是一份详细的、手把手式的部署指南，让你们的爱巢正式安家在互联网上

## 📋 部署前准备清单

### 1. 账号注册
确保你已经注册了以下平台的账号：
- [ ] [GitHub](https://github.com) - 代码仓库
- [ ] [Vercel](https://vercel.com) - 网站托管
- [ ] [Supabase](https://supabase.com) - 后端数据库
- [ ] [Mapbox](https://mapbox.com) - 地图服务（可选）

### 2. 环境变量收集
准备好以下信息：
- [ ] 你们的专属密码和昵称
- [ ] Supabase 项目 URL 和 API 密钥
- [ ] JWT 加密密钥（长随机字符串）
- [ ] Mapbox 访问令牌（如果需要地图功能）

## 🗄️ 第一步：Supabase 数据库设置

### 1.1 创建项目
1. 登录 [Supabase](https://supabase.com)
2. 点击 "New project"
3. 选择离你们较近的区域（如 Singapore 或 Tokyo）
4. 设置项目名称：`heart-footprints`
5. 设置强密码并记录下来

### 1.2 执行数据库脚本
1. 项目创建完成后，进入左侧菜单的 "SQL Editor"
2. 点击 "New Query"
3. 复制 `supabase/migrations/001_initial_schema.sql` 的全部内容
4. 粘贴到编辑器中，点击 "RUN"
5. 确认所有表格创建成功

### 1.3 创建存储桶
1. 进入左侧菜单的 "Storage"
2. 点击 "New bucket"
3. 创建名为 `memories` 的存储桶（用于照片）
4. 创建名为 `backgrounds` 的存储桶（用于倒计时背景）
5. 设置两个存储桶为 public

### 1.4 获取 API 密钥
1. 进入左侧菜单的 "Settings" → "API"
2. 记录下以下信息：
   - Project URL
   - Project API Keys 中的 `anon` `public` key

## 🐙 第二步：GitHub 仓库设置

### 2.1 创建私有仓库
1. 登录 GitHub
2. 点击 "New repository"
3. 仓库名称：`heart-footprints`
4. ⚠️ **重要：选择 "Private"** - 这是你们的私人空间
5. 勾选 "Add a README file"
6. 创建仓库

### 2.2 上传代码
在本地项目目录中执行：

```bash
# 初始化 Git
git init

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/yourusername/heart-footprints.git

# 添加所有文件
git add .

# 第一次提交
git commit -m "Initial commit: Heart Footprints MVP ❤️

🎯 Generated with Claude Code
https://claude.ai/code

Co-Authored-By: Claude <noreply@anthropic.com>"

# 推送到远程
git branch -M main
git push -u origin main
```

## 🚀 第三步：Vercel 部署

### 3.1 连接项目
1. 登录 [Vercel](https://vercel.com)（使用 GitHub 账号登录）
2. 在 Dashboard 点击 "Add New..." → "Project"
3. 找到你的 `heart-footprints` 仓库，点击 "Import"

### 3.2 配置项目
1. Framework Preset: 确认是 "Next.js"
2. Root Directory: 保持默认 "./"
3. Build and Output Settings: 保持默认

### 3.3 设置环境变量
在 "Environment Variables" 区域，添加以下变量：

```
# 我们的暗号
USER_HIM_PASSWORD=你的专属密码
USER_HER_PASSWORD=她的专属密码
USER_HIM_NAME=你的昵称
USER_HER_NAME=她的昵称

# JWT 密钥（生成一个长随机字符串）
JWT_SECRET=例如：sk_f8d9a0b1c2e3f4g5h6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6c7d8e9f0

# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的_supabase_anon_key

# Mapbox（可选）
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token

# 应用配置
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### 3.4 部署
1. 点击 "Deploy" 按钮
2. 等待构建完成（通常需要 2-3 分钟）
3. 🎉 部署成功！你会得到一个 `.vercel.app` 的网址

## 🌐 第四步：自定义域名（可选）

### 4.1 购买域名
推荐平台：
- [Namecheap](https://namecheap.com)
- [GoDaddy](https://godaddy.com)
- [阿里云万网](https://wanwang.aliyun.com)

选择一个有意义的域名，如：
- `our-story.com`
- `heartfootprints.love`
- `你们的名字.com`

### 4.2 在 Vercel 绑定域名
1. 在 Vercel 项目页面，进入 "Settings" → "Domains"
2. 输入你购买的域名，点击 "Add"
3. Vercel 会给你一些 DNS 记录

### 4.3 配置 DNS
1. 登录你的域名提供商后台
2. 找到 DNS 设置
3. 按照 Vercel 提供的记录配置：
   - 通常是添加 A 记录指向 Vercel 的 IP
   - 或者 CNAME 记录指向你的 `.vercel.app` 域名

### 4.4 等待生效
- DNS 配置需要几小时到 24 小时生效
- 生效后，Vercel 会自动配置 SSL 证书
- 你们就有了自己的专属网址！

## 🔧 第五步：测试验证

### 5.1 功能测试
访问你的网站，测试以下功能：
- [ ] 登录页面是否正常显示
- [ ] 使用设置的密码能否成功登录
- [ ] 主页面是否正确显示用户昵称
- [ ] 退出功能是否正常

### 5.2 安全检查
- [ ] 确认私有仓库设置正确
- [ ] 确认环境变量中没有泄露敏感信息
- [ ] 确认网站使用了 HTTPS

## 🔄 第六步：后续维护

### 6.1 代码更新流程
```bash
# 修改代码后
git add .
git commit -m "描述你的更新"
git push

# Vercel 会自动部署新版本
```

### 6.2 环境变量更新
1. 进入 Vercel 项目设置
2. 修改 Environment Variables
3. 点击 "Redeploy" 重新部署

### 6.3 数据库维护
- Supabase 会自动备份数据
- 可以在 Settings → Database 查看备份记录

## ⚠️ 重要提醒

### 安全最佳实践
1. **永远不要**将 `.env` 文件提交到 GitHub
2. **定期更换**密码和 JWT 密钥
3. **监控**Supabase 和 Vercel 的使用量
4. **备份**重要的照片和数据

### 成本考虑
- Vercel: 个人用途完全免费
- Supabase: 免费套餐足够使用
- 域名: 约 10-50 元/年
- 总成本: 基本免费，只有域名费用

## 🎉 部署完成！

恭喜！你们的「心迹地图」现在已经正式上线了！

现在你可以：
1. 将网址发给她
2. 一起输入你们的暗号
3. 开始记录属于你们的美好时光

记住这个特殊的时刻 - 这是你们数字爱情故事的开始。

---

*愿你们的爱情像这个网站一样，用心经营，历久弥新* ✨

如果在部署过程中遇到任何问题，记住：每一个问题的解决，都是你们共同成长的见证。