require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function createAdmin() {
    console.log('=== 创建管理员账户 ===\n');
    
    const username = await askQuestion('请输入管理员用户名: ');
    const password = await askQuestion('请输入管理员密码: ');
    const email = await askQuestion('请输入邮箱（可选，直接回车跳过）: ');
    
    if (!username || !password) {
        console.error('错误：用户名和密码不能为空');
        process.exit(1);
    }
    
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });
    
    try {
        // 检查用户表是否存在
        const [tables] = await connection.execute(
            "SHOW TABLES LIKE 'users'"
        );
        
        if (tables.length === 0) {
            console.log('\n用户表不存在，请先运行迁移：npm run migrate');
            process.exit(1);
        }
        
        // 检查是否已有同名用户
        const [existing] = await connection.execute(
            'SELECT COUNT(*) as count FROM users WHERE username = ?',
            [username]
        );
        
        if (existing[0].count > 0) {
            console.log(`\n错误：用户 "${username}" 已存在`);
            process.exit(1);
        }
        
        // 加密密码
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        // 创建管理员
        await connection.execute(
            'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
            [username, hashedPassword, email || null, 'admin']
        );
        
        console.log('\n✓ 管理员账户创建成功！');
        console.log(`  用户名: ${username}`);
        console.log(`  角色: admin`);
        console.log('\n现在可以访问 http://your-domain/admin.html 进行登录');
        
    } catch (error) {
        console.error('\n创建失败:', error.message);
    } finally {
        await connection.end();
        rl.close();
    }
}

createAdmin();