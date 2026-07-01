# 部署指南 — aigo.toppeertalk.com

将「刘伯温预测股市」部署到 `toppeertalk.com` 服务器子域名。

## 目录结构

```
deploy/
├── deploy.sh                          # 首次部署（应用 + PM2）
├── update.sh                          # 日常更新
├── nginx-install.sh                   # 安装 Nginx 站点（需 sudo）
├── ssl-setup.sh                       # 申请 Let's Encrypt 证书（需 sudo）
├── ecosystem.config.cjs               # PM2 配置
├── env.production.example             # 生产环境变量模板
└── nginx/
    ├── aigo.toppeertalk.com.conf      # 完整 HTTPS 配置
    └── aigo.toppeertalk.com.http-only.conf  # 首次部署 / 申请证书前
```

## 前置条件

| 项目 | 要求 |
|------|------|
| 服务器 | Linux（Ubuntu 20.04+ / CentOS 7+） |
| Node.js | >= 18 |
| 域名 DNS | `A` 记录 `aigo` → 服务器公网 IP |
| 端口 | 80、443 已开放 |

## 一键部署流程

### 1. SSH 登录服务器

```bash
ssh user@your-server
```

### 2. 安装 Node.js（如未安装）

```bash
# Ubuntu
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git

# 或使用 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash
nvm install 20
```

### 3. 克隆并部署

```bash
sudo mkdir -p /var/www
sudo git clone https://github.com/bnba917-debug/Trigram-Algo.git /var/www/trigram-algo
sudo chown -R $USER:$USER /var/www/trigram-algo
cd /var/www/trigram-algo

chmod +x deploy/*.sh

# 配置环境变量
cp deploy/env.production.example .env
nano .env   # 修改 ADMIN_PASSWORD、AI_API_KEY

# 部署应用 + PM2
./deploy/deploy.sh
```

### 4. 配置 Nginx

```bash
sudo ./deploy/nginx-install.sh
```

此时可通过 `http://aigo.toppeertalk.com` 访问。

### 5. 申请 HTTPS 证书

```bash
SSL_EMAIL=your@email.com sudo ./deploy/ssl-setup.sh
```

完成后访问 `https://aigo.toppeertalk.com`。

## 日常更新

```bash
cd /var/www/trigram-algo
./deploy/update.sh
```

## 常用运维命令

```bash
# 查看进程状态
pm2 status

# 查看日志
pm2 logs trigram-algo

# 重启应用
pm2 restart trigram-algo

# 测试 Nginx 配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx

# 备份数据库
cp data/trigram.db data/trigram.db.bak.$(date +%Y%m%d)
```

## 环境变量说明

| 变量 | 生产建议 |
|------|----------|
| `PORT` | `3000`（仅本机监听，由 Nginx 反代） |
| `ADMIN_PASSWORD` | 强口令，16 位以上 |
| `DEBUG_UNLOCK` | `false` |
| `AI_API_KEY` | Kimi API Key |

## 访问地址

| 页面 | URL |
|------|-----|
| 前台 | https://aigo.toppeertalk.com/ |
| 管理后台 | https://aigo.toppeertalk.com/admin |

## 故障排查

### 502 Bad Gateway

```bash
pm2 status                    # 确认进程 online
curl http://127.0.0.1:3000/ # 确认本机可访问
pm2 logs trigram-algo        # 查看错误日志
```

### 证书申请失败

- 确认 DNS 已生效：`dig aigo.toppeertalk.com`
- 确认 80 端口可从公网访问
- 使用 HTTP-only 配置后再运行 `ssl-setup.sh`

### SQLite 权限错误

```bash
chmod 755 data
chown -R $USER:$USER data
```

## 自定义部署路径

```bash
APP_DIR=/home/user/apps/trigram-algo ./deploy/deploy.sh
```
