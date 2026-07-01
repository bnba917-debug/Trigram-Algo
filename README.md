# 刘伯温预测股市

AI 玄学娱乐站：每日限时开坛，Three.js 星辰阵动画 + Kimi 生成「天机批注」。

> **免责声明**：本站内容纯属娱乐，不构成任何投资建议。股市有风险，盈亏自负。

## 功能概览

| 时段 | 行为 |
|------|------|
| 任意时间 | 管理后台录入股票、生成 AI 批注 |
| 9:00 – 14:18 | 前台封坛，显示倒计时 |
| 其余时间 | 前台开坛，用户观看动画并查看今日卦象 |
| 其他时间 | 倒计时「天机不可泄露」 |

## 本地开发

```bash
npm install
cp .env.example .env   # 编辑配置
npm start              # http://localhost:3000
npm test
```

开发调试（跳过时间限制）：

```env
DEBUG_UNLOCK=true
```

或访问 `http://localhost:3000/?debug=1`（仅前台）。

## 环境变量

| 变量 | 说明 |
|------|------|
| `PORT` | 服务端口，默认 3000 |
| `ADMIN_PASSWORD` | 管理后台口令，**生产必改** |
| `DEBUG_UNLOCK` | `false` = 生产；`true` = 全天开坛 |
| `AI_PROVIDER` | `kimi`（默认）或 `openai` |
| `AI_API_KEY` | Kimi / OpenAI API Key |
| `AI_API_BASE` | 国内 `https://api.moonshot.cn/v1` |
| `AI_MODEL` | 推荐 `kimi-k2.6` |

未配置 `AI_API_KEY` 时使用内置 mock 批注。

## 页面

- 前台：`/`
- 管理后台：`/admin`

## 生产部署

### 1. 服务器要求

- Node.js 18+
- 开放 HTTP/HTTPS 端口（建议 443）

### 2. 配置

```bash
git clone <repo> trigram-algo
cd trigram-algo
npm install --production
cp .env.example .env
```

编辑 `.env`：

```env
ADMIN_PASSWORD=<强口令，16位以上>
DEBUG_UNLOCK=false
AI_API_KEY=sk-xxx
AI_MODEL=kimi-k2.6
PORT=3000
```

### 3. 使用 PM2 守护进程

```bash
npm install -g pm2
pm2 start backend/src/index.js --name trigram-algo
pm2 save
pm2 startup
```

### 4. Nginx 反向代理（示例）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

建议配合 Certbot 启用 HTTPS。

### 5. 数据持久化

SQLite 数据库位于 `data/trigram.db`，部署时请备份该目录。

### 6. 上线检查清单

- [ ] `DEBUG_UNLOCK=false`
- [ ] `ADMIN_PASSWORD` 已改为强口令
- [ ] `AI_API_KEY` 已配置且有余额
- [ ] 防火墙仅暴露 80/443
- [ ] `.env` 未提交到 Git（已在 `.gitignore`）
- [ ] 每日开坛前确认今日卦象已在 `/admin` 录入

## 日常运营

1. **任意时间**：登录 `/admin`，录入股票代码（6 位数字）与名称，点击「生成并封存今日天机」
2. **9:00 前或 14:18 后**：用户访问首页，点击「启坛引星辰」
3. **9:00 – 14:18**：封坛，显示距离开坛倒计时

## 技术栈

- 后端：Node.js + Express + better-sqlite3
- 前端：Three.js + GSAP + Canvas 数字雨
- AI：Kimi（Moonshot OpenAI 兼容 API）
