import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 1. 设置最强兼容跨域头（保留并加固）
    // 允许来自任何域的请求，这对于本地测试至关重要
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    // 明确列出常见的 Header，防止某些浏览器拦截
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); 

    // 2. 必须优先处理 OPTIONS 预检请求（不修改逻辑，确保提前退出）
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. 校验请求方法
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: '必须使用 POST 请求' });
    }

    // 获取前端发送的数据
    const { password, cards, newCard, mode } = req.body;

    // 4. 验证密码 (需在 Vercel 环境变量中设置 ADMIN_PASSWORD)
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: '口令校验失败' });
    }

    try {
        // 5. 统一识别输入源（保留你的优先级逻辑）
        // 优先级：cards (批量/全量) > newCard (单张)
        const inputData = cards || newCard;
        if (!inputData) {
            return res.status(400).json({ success: false, message: '未检测到任何数据内容' });
        }

        // 6. 将输入包装成数组
        const newItems = Array.isArray(inputData) ? inputData : [inputData];

        // 7. 读取旧数据（数据库名：postcard）
        const oldData = await kv.get('postcard') || [];

        // 8. 合并数据 (新录入的在前)
        const finalData = [...newItems, ...oldData];

        // 9. 一次性写入 KV
        await kv.set('postcard', finalData);

        return res.status(200).json({ 
            success: true, 
            message: `同步成功！本次处理 ${newItems.length} 条数据。`,
            total: finalData.length 
        });
    } catch (error) {
        console.error('KV Error:', error);
        return res.status(500).json({ 
            success: false, 
            message: '数据库连接失败: ' + error.message 
        });
    }
}