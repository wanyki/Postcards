# 明信片管理系统 📮

一个用于管理和展示明信片收藏的 Web 应用，支持地图可视化、时间线展示、数据分析等功能。

> 📖 **部署文档**：详细的部署教程请查看 [DeployDoc/DEPLOY.md](./DeployDoc/DEPLOY.md)

> 📋 **更新日志**：查看 [CHANGELOG.md](./CHANGELOG.md) 了解版本更新内容

> 整个项目是个人学习摸索出来的，如果部署在服务器请谨慎，可能会有漏洞，不对安全性进行保证
## ✨ 功能特性

### 前台展示
- 🖼️ **明信片画廊** - 瀑布流展示所有明信片
- 🗺️ **地图足迹** - 国内/全球热力图展示
- 📅 **时间线** - 按日期筛选和浏览
- 📊 **数据中心** - 统计分析和趣味数据
- 📱 **响应式设计** - 支持手机和电脑访问

### 后台管理
- 📝 **明信片管理** - 增删改查明信片
- 📥 **批量导入** - 支持 Excel 文件批量导入
- 👤 **用户认证** - JWT 登录认证
- 🔒 **安全防护** - 速率限制、CORS 配置

## 🛠️ 技术栈

### 前端
- **HTML5** + **CSS3** + **JavaScript**
- **Vue.js 2** - 响应式框架
- **Bootstrap 5** - UI 框架
- **ECharts** - 地图和图表可视化
- **SheetJS** - Excel 文件解析

### 后端
- **Node.js** - 运行环境
- **Express** - Web 框架
- **MySQL** - 数据库
- **JWT** - 身份认证
- **bcrypt** - 密码加密

## 📁 项目结构

```
Postcards/
├── index.html          # 主页面（明信片画廊）
├── detail.html         # 明信片详情页
├── timeline.html       # 时间线页面
├── dashboard.html      # 数据中心页面
├── admin.html          # 管理后台页面
├── app.js              # 前端主逻辑
├── cityData.js         # 中国城市数据
├── libs/               # 本地化第三方库
├── .gitignore          # Git 忽略配置
├── README.md           # 项目说明
├── CHANGELOG.md        # 更新日志
├── DeployDoc/          # 部署文档目录
│   └── DEPLOY.md       # 部署文档
└── server/             # 后端服务
    ├── app.js          # 服务器主文件
    ├── package.json    # 依赖配置
    ├── package-lock.json # 依赖锁定
    ├── .env.example    # 环境变量模板
    ├── create-admin.js # 创建管理员脚本
    ├── migrate.js      # 数据库迁移脚本
    └── migrations/     # 迁移文件
        └── 001_create_users_table.sql
```

## 🚀 快速开始

### 本地开发

1. **克隆项目**
```bash
git clone <仓库地址>
cd Postcards
```

2. **安装依赖**
```bash
cd server
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，填入数据库配置
```

4. **初始化数据库**
```bash
npm run migrate
```

5. **创建管理员**
```bash
npm run create-admin
```

6. **启动服务**
```bash
npm start
```

7. **访问应用**
- 前台：http://localhost:3000
- 后台：http://localhost:3000/admin.html

## 📖 使用说明

### 添加明信片

1. 访问管理后台 `/admin.html`
2. 登录管理员账号
3. 点击「添加明信片」或使用「批量导入」

### 批量导入

1. 准备 Excel 文件（.xlsx 或 .xls）
2. 第一行为表头，支持的列名：
   - `id` - 编号（必填）
   - `type` - 类型（收到/寄出）
   - `country` - 国家
   - `region` - 地区
   - `person` - 人物
   - `platform` - 平台
   - `sendDate` - 寄出日期
   - `receiveDate` - 收到日期
   - `imgFront` - 图片链接
   - `note` - 备注
   - `tags` - 标签（逗号分隔）

3. 在管理后台选择「批量导入」上传文件

## 🔧 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_HOST` | 数据库地址 | localhost |
| `DB_PORT` | 数据库端口 | 3306 |
| `DB_USER` | 数据库用户名 | - |
| `DB_PASSWORD` | 数据库密码 | - |
| `DB_NAME` | 数据库名称 | - |
| `PORT` | 服务端口 | 3000 |
| `JWT_SECRET` | JWT 密钥 | - |
| `JWT_EXPIRES_IN` | JWT 过期时间 | 24h |
| `ALLOWED_ORIGINS` | 允许的来源 | * |

## 📦 API 接口

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|:----:|
| GET | `/api/postcards` | 获取所有明信片 | ❌ |
| GET | `/api/postcards/:id` | 获取单个明信片 | ❌ |
| POST | `/api/postcards` | 添加明信片 | ✅ |
| PUT | `/api/postcards/:id` | 更新明信片 | ✅ |
| DELETE | `/api/postcards/:id` | 删除明信片 | ✅ |
| POST | `/api/auth/login` | 用户登录 | ❌ |
| GET | `/api/auth/me` | 获取当前用户 | ✅ |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
