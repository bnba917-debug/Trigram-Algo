# Docker 部署指南 — aigo.toppeertalk.com

推荐在 **CentOS 8 / 旧版 Linux** 上使用 Docker，避免 `better-sqlite3` 本地编译问题。

## 架构

```text
用户 → Nginx 容器 (80/443) → trigram-algo 容器 (3000) → SQLite 数据卷
                ↑
         certbot 容器（申请证书时临时运行）
```

**无需在宿主机安装 Nginx 或 Node.js**，只需安装 Docker。

## 前置条件

| 项目 | 要求 |
|------|------|
| Docker | 20.10+ |
| Docker Compose | v2（`docker compose`） |
| 域名 DNS | `aigo` A 记录 → 服务器 IP |
| 端口 | 80、443 开放（安全组 + 防火墙） |

## 安装 Docker（CentOS 8）

```bash
# 安装 Docker
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

sudo systemctl enable --now docker

# 验证
docker --version
docker compose version
```

若 CentOS 8 源失效，先切换 vault 源（见主 README）。

## 一键部署

```bash
cd /var/www/trigram-algo
git pull --ff-only origin master
chmod +x deploy/*.sh

# 配置环境变量
cp deploy/env.production.example .env
nano .env   # 修改 ADMIN_PASSWORD、AI_API_KEY

# 构建并启动（含 Nginx 容器）
./deploy/docker-deploy.sh
```

部署完成后可通过 `http://aigo.toppeertalk.com` 访问。

## 自动申请 HTTPS

部署时**默认自动申请** Let's Encrypt 证书，**无需配置邮箱**。

```bash
./deploy/docker-deploy.sh
```

可选：在 `.env` 中填写邮箱，证书到期前会收到邮件提醒：

```env
SSL_EMAIL=你的真实邮箱@example.com
# DOMAIN=aigo.toppeertalk.com   # 可选，默认已是此域名
```

前提：DNS 已解析到本机，**80 端口**可从公网访问。

### 证书自动续期（建议）

```bash
sudo ./deploy/docker-ssl-cron.sh   # 每月自动续期
```

## 手动申请 HTTPS（可选）

若自动申请失败，可单独执行：

```bash
SSL_EMAIL=你的邮箱@example.com ./deploy/docker-ssl.sh
```

## ~~配置 Nginx + HTTPS~~（宿主机方式，可选）

若不想用 Docker 内 Nginx，才需要：

```bash
sudo ./deploy/nginx-install.sh
SSL_EMAIL=your@email.com sudo ./deploy/ssl-setup.sh
```

## 常用命令

```bash
# 查看状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启
docker compose restart

# 停止
docker compose down

# 更新代码并重新部署
./deploy/docker-update.sh

# 续期证书（可加入 crontab，每月执行）
./deploy/docker-ssl-renew.sh
```

## 数据持久化

SQLite 数据保存在 Docker 卷 `trigram-data` 中：

```bash
# 查看卷
docker volume ls | grep trigram

# 备份数据库（从卷中导出）
docker compose exec trigram-algo sh -c 'cat /app/data/trigram.db' > trigram.db.bak
```

## 环境变量

通过项目根目录 `.env` 注入容器，与 PM2 部署相同：

| 变量 | 说明 |
|------|------|
| `ADMIN_PASSWORD` | 管理后台口令 |
| `DEBUG_UNLOCK` | 生产设为 `false` |
| `AI_API_KEY` | Kimi API Key |

## 与 PM2 部署对比

| | Docker | PM2 |
|---|--------|-----|
| 旧版 Linux 兼容 | ✅ 推荐 | ❌ 需编译 native 模块 |
| 资源占用 | 略高 | 更低 |
| 更新方式 | `docker-update.sh` | `update.sh` |

## 故障排查

### 容器启动失败

```bash
docker compose logs trigram-algo
```

### 502 Bad Gateway

```bash
docker compose ps          # 确认容器 running
curl http://127.0.0.1:3000/api/status
```

### 重新构建（清除缓存）

```bash
docker compose down
docker compose build --no-cache
docker compose up -d
```
