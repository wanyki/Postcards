require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
}));

// CORS 配置
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
    origin: function (origin, callback) {
        // 如果没有设置 ALLOWED_ORIGINS，允许所有来源
        if (!process.env.ALLOWED_ORIGINS) {
            return callback(null, true);
        }
        
        // 允许没有 origin 的请求（如移动应用、Postman）
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// 速率限制
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 100, // 每个 IP 最多 100 个请求
    message: { error: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 登录尝试限制
    message: { error: '登录尝试过于频繁，请15分钟后再试' }
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务 - 将上级目录作为静态文件目录
app.use(express.static(path.join(__dirname, '..'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
        } else if (filePath.endsWith('.woff')) {
            res.setHeader('Content-Type', 'font/woff');
        } else if (filePath.endsWith('.ttf')) {
            res.setHeader('Content-Type', 'font/ttf');
        }
    }
}));

// 创建 MySQL 连接池
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 测试数据库连接
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('MySQL 数据库连接成功');
        connection.release();
    } catch (error) {
        console.error('MySQL 连接失败:', error.message);
    }
}

// 格式化日期为 YYYY-MM-DD 格式
function formatDate(date) {
    if (!date) return null;
    if (typeof date === 'string') return date.split('T')[0];
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化记录中的日期字段
function formatRecord(record) {
    if (!record) return null;
    return {
        ...record,
        sendDate: formatDate(record.sendDate),
        receiveDate: formatDate(record.receiveDate)
    };
}

// JWT 认证中间件（必须在使用之前定义）
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: '访问被拒绝，需要登录' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        const message = error.name === 'TokenExpiredError'
            ? '登录已过期，请重新登录'
            : '无效的访问令牌';
        return res.status(401).json({ error: message });
    }
};

// API 路由：获取所有明信片
app.get('/api/postcards', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM postcard');
        const formattedRows = rows.map(formatRecord);
        res.json({ data: formattedRows, error: null });
    } catch (error) {
        console.error('查询失败:', error);
        res.status(500).json({ data: null, error: error.message });
    }
});

// API 路由：根据 ID 获取单个明信片
app.get('/api/postcards/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM postcard WHERE id = ?', [req.params.id]);
        const formattedRecord = formatRecord(rows[0] || null);
        res.json({ data: formattedRecord, error: null });
    } catch (error) {
        console.error('查询失败:', error);
        res.status(500).json({ data: null, error: error.message });
    }
});

// API 路由：添加明信片（需要认证）
app.post('/api/postcards', authenticateToken, async (req, res) => {
    try {
        const { id, type, country, region, note, tags, imgFront, sendDate, receiveDate, person, platform } = req.body;
        const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : tags;
        
        const [result] = await pool.execute(
            'INSERT INTO postcard (id, type, country, region, note, tags, imgFront, sendDate, receiveDate, person, platform) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, type, country, region, note, tagsStr, imgFront, sendDate, receiveDate, person, platform]
        );
        res.json({ data: result, error: null });
    } catch (error) {
        console.error('插入失败:', error);
        res.status(500).json({ data: null, error: error.message });
    }
});

// API 路由：更新明信片（需要认证）
app.put('/api/postcards/:id', authenticateToken, async (req, res) => {
    try {
        const { type, country, region, note, tags, imgFront, sendDate, receiveDate, person, platform } = req.body;
        const tagsStr = Array.isArray(tags) ? JSON.stringify(tags) : tags;
        
        const [result] = await pool.execute(
            'UPDATE postcard SET type=?, country=?, region=?, note=?, tags=?, imgFront=?, sendDate=?, receiveDate=?, person=?, platform=? WHERE id=?',
            [type, country, region, note, tagsStr, imgFront, sendDate, receiveDate, person, platform, req.params.id]
        );
        res.json({ data: result, error: null });
    } catch (error) {
        console.error('更新失败:', error);
        res.status(500).json({ data: null, error: error.message });
    }
});

// API 路由：删除明信片（需要认证）
app.delete('/api/postcards/:id', authenticateToken, async (req, res) => {
    try {
        const [result] = await pool.execute('DELETE FROM postcard WHERE id = ?', [req.params.id]);
        res.json({ data: result, error: null });
    } catch (error) {
        console.error('删除失败:', error);
        res.status(500).json({ data: null, error: error.message });
    }
});

// 用户认证路由
app.post('/api/auth/login', [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    
    try {
        const { username, password } = req.body;
        
        // 查询用户
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ? AND is_active = TRUE',
            [username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        const user = users[0];
        
        // 验证密码
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 更新最后登录时间
        await pool.execute(
            'UPDATE users SET last_login = NOW() WHERE id = ?',
            [user.id]
        );
        
        // 生成 JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );
        
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败，请稍后再试' });
    }
});

// 获取当前用户信息
app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.execute(
            'SELECT id, username, email, role, last_login FROM users WHERE id = ?',
            [req.user.id]
        );
        
        if (users.length === 0) {
            return res.status(404).json({ error: '用户不存在' });
        }
        
        res.json({ data: users[0] });
    } catch (error) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ error: '获取用户信息失败' });
    }
});

// 注意：管理员只能通过命令行创建：npm run create-admin

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    testConnection();
});
