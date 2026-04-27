# Cloudflare Pages 部署指引

项目已完成适配 Cloudflare Pages 的重构。路由逻辑已迁移至 `/functions` 目录，可实现前端与后端的完美适配。

## 部署步骤

### 1. 准备工作
- 确保你拥有 **Cloudflare 账户**。
- 将代码上传至 **GitHub** 仓库（或使用 Cloudflare Wrangler CLI 手动部署）。

### 2. 在 Cloudflare 控制台创建项目
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 点击左侧菜单的 **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**。
3. 选择你的项目仓库。

### 3. 配置构建设置
- **Framework preset**: `Vite` (如果没有，选择 `None`)。
- **Build command**: `npm run build`。
- **Build output directory**: `dist`。
- **Root directory**: `/`。

### 4. 设置环境变量 (重要)
**如何获取 API Key**: 访问 [Google AI Studio](https://aistudio.google.com/app/apikey) 即可免费创建和获取。

在部署之前或之后，必须在 Cloudflare 的 **Settings** 中设置 API Key：
1. 进入项目设置：**Settings** -> **Functions** -> **Environment variables**。
2. 在 **Production** 和 **Preview** 两个环境下都添加以下变量：
   - Variable name: `GEMINI_API_KEY`
   - Value: `你的 Google AI Studio API Key`
3. 保存并重新部署。

### 5. 关于 /functions 目录
- Cloudflare Pages 会自动识别根目录下的 `functions` 文件夹。
- 本项目中 `/functions/api/verify-handwriting.ts` 会被自动映射为接口：`https://你的域名/api/verify-handwriting`。
- 前端请求已经通过相对路径 `/api/verify-handwriting` 进行了硬匹配，无需额外修改代码。

## 优势
- **全栈合一**: 无需额外维护服务器。
- **全球边缘网络**: 极大优化某些地区访问 Gemini API 的网络延迟和成功率。
- **自动扩容**: 无论有多少用户同时听写，Cloudflare 都会自动处理并发。
