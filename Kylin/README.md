# Ctool Kylin 环境包

Ctool 程序开发常用工具集的 Kylin 系统部署环境包，包含 nginx 服务配置和前端静态文件。

## 目录结构

```
Kylin/
├── app/                      # 前端静态文件
│   ├── index.html           # 入口页面
│   ├── assets/              # 静态资源
│   └── ...
├── nginx/                    # nginx 配置
│   ├── conf/
│   │   ├── nginx.conf       # 主配置文件
│   │   └── mime.types       # MIME 类型配置
│   └── logs/                # 日志目录
├── scripts/                  # 运维脚本
│   ├── install-nginx.sh     # nginx 安装脚本
│   ├── start.sh             # 启动服务
│   ├── stop.sh              # 停止服务
│   ├── restart.sh           # 重启服务
│   └── status.sh            # 查看状态
└── README.md                 # 本文档
```

## 环境要求

- 操作系统：Kylin V10 / Kylin V4 或其他 Linux 发行版
- 架构：x86_64 (AMD64) 或 ARM64 (aarch64)
- nginx：1.18+（需要手动安装）

## 快速开始

### 1. 安装 nginx

```bash
cd Kylin
chmod +x scripts/*.sh
./scripts/install-nginx.sh
```

脚本会自动检测系统架构和包管理器，并提供相应的安装命令。

### 2. 启动服务

```bash
./scripts/start.sh
```

默认监听 80 端口，如需使用其他端口：

```bash
./scripts/start.sh 8080
```

### 3. 访问应用

启动成功后，在浏览器中访问：

```
http://localhost
```

或使用自定义端口：

```
http://localhost:8080
```

## 服务管理

### 启动服务

```bash
./scripts/start.sh [端口]
```

### 停止服务

```bash
./scripts/stop.sh
```

### 重启服务

```bash
./scripts/restart.sh [端口]
```

### 查看状态

```bash
./scripts/status.sh
```

## 配置说明

### 端口配置

默认配置使用 80 端口，可通过以下方式修改：

1. **临时修改**：启动时指定端口
   ```bash
   ./scripts/start.sh 8080
   ```

2. **永久修改**：编辑 `nginx/conf/nginx.conf`
   ```nginx
   server {
       listen 8080;  # 修改此处
       ...
   }
   ```

### 静态文件更新

如需更新前端文件，直接替换 `app/` 目录下的文件即可：

```bash
# 解压新的构建产物
unzip ctool_web.zip -d app/
```

### 日志查看

```bash
# 查看错误日志
cat nginx/logs/error.log

# 查看访问日志（如需启用，请修改 nginx.conf）
cat nginx/logs/access.log
```

## 常见问题

### Q1: 启动失败，提示端口被占用

**解决方案**：
1. 检查端口占用：`ss -tlnp | grep :80`
2. 停止占用进程或使用其他端口：`./scripts/start.sh 8080`

### Q2: 启动失败，提示权限不足

**解决方案**：
80 端口需要 root 权限，请使用 sudo 或切换到 root 用户：
```bash
sudo ./scripts/start.sh
```

或使用非特权端口（1024 以上）：
```bash
./scripts/start.sh 8080
```

### Q3: 页面无法访问，显示 404

**解决方案**：
1. 检查 `app/` 目录下是否存在 `index.html`
2. 检查 nginx 配置中的 root 路径是否正确
3. 查看 nginx 错误日志：`cat nginx/logs/error.log`

### Q4: nginx 未安装

**解决方案**：
运行安装脚本获取安装指导：
```bash
./scripts/install-nginx.sh
```

或手动安装：
```bash
# Kylin/Ubuntu/Debian
sudo apt update
sudo apt install -y nginx

# Kylin/CentOS/RHEL
sudo yum install -y epel-release
sudo yum install -y nginx
```

### Q5: 如何配置 HTTPS

**解决方案**：
1. 准备 SSL 证书文件
2. 修改 `nginx/conf/nginx.conf`，添加 SSL 配置：
   ```nginx
   server {
       listen 443 ssl;
       ssl_certificate     /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       ...
   }
   ```
3. 重启服务：`./scripts/restart.sh`

## 安全建议

1. **使用非 root 用户运行**：配置 nginx 以非特权用户身份运行
2. **限制访问**：如需限制访问，可在 nginx.conf 中配置 IP 白名单
3. **启用 HTTPS**：生产环境建议启用 HTTPS
4. **定期更新**：保持 nginx 版本更新，及时修复安全漏洞

## 技术支持

- 项目主页：https://ctool.dev
- GitHub：https://github.com/baiy/Ctool
- 问题反馈：https://github.com/baiy/Ctool/issues

## 许可证

本项目采用 MIT 许可证，详见 [LICENSE](../LICENSE) 文件。
