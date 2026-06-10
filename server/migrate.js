require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        multipleStatements: true
    });

    try {
        // 创建迁移记录表
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 获取已运行的迁移
        const [runMigrations] = await connection.execute('SELECT name FROM migrations');
        const runNames = runMigrations.map(r => r.name);

        // 读取迁移文件
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();

        for (const file of files) {
            if (!runNames.includes(file)) {
                console.log(`Running migration: ${file}`);
                const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                
                // 分割多个SQL语句
                const statements = sql.split(';').filter(s => s.trim());
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        await connection.execute(statement);
                    }
                }
                
                // 记录迁移
                await connection.execute('INSERT INTO migrations (name) VALUES (?)', [file]);
                console.log(`✓ ${file}`);
            }
        }

        console.log('All migrations completed!');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        await connection.end();
    }
}

// 创建新迁移文件
async function createMigration(name) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `${timestamp}_${name}.sql`;
    const filepath = path.join(migrationsDir, filename);
    
    fs.writeFileSync(filepath, `-- Migration: ${name}\n-- Created: ${new Date().toISOString()}\n\n`);
    console.log(`Created migration: ${filename}`);
}

// 回滚最后一个迁移
async function rollbackMigration() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        const [lastMigration] = await connection.execute(
            'SELECT name FROM migrations ORDER BY id DESC LIMIT 1'
        );
        
        if (lastMigration.length === 0) {
            console.log('No migrations to rollback');
            return;
        }

        const migrationName = lastMigration[0].name;
        console.log(`Rolling back: ${migrationName}`);
        
        // 删除迁移记录
        await connection.execute('DELETE FROM migrations WHERE name = ?', [migrationName]);
        console.log(`✓ Rolled back ${migrationName}`);
        console.log('Note: Manual rollback of SQL changes may be required');
    } catch (error) {
        console.error('Rollback failed:', error);
    } finally {
        await connection.end();
    }
}

// 命令行参数处理
const command = process.argv[2];

if (command === 'create') {
    const name = process.argv[3];
    if (!name) {
        console.error('Please provide migration name: npm run migrate:create <name>');
        process.exit(1);
    }
    createMigration(name);
} else if (command === 'rollback') {
    rollbackMigration();
} else {
    runMigrations();
}