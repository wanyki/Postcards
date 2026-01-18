import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 1. 设置最强兼容跨域头
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Max-Age', '86400'); // 允许预检请求缓存 24 小时

    // 2. 必须优先处理 OPTIONS 预检
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 3. 校验请求方法
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: '必须使用 POST 请求' });
    }

    const { password, cards, newCard, mode } = req.body;

    // 1. 验证密码 (需在 Vercel 环境变量中设置 ADMIN_PASSWORD)
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: '口令校验失败' });
    }

    try {
        // 2. 统一识别输入源
        // 优先级：cards (批量/全量) > newCard (单张)
        const inputData = cards || newCard;
        if (!inputData) {
            return res.status(400).json({ success: false, message: '未检测到任何数据内容' });
        }

        // 3. 将输入包装成数组
        const newItems = Array.isArray(inputData) ? inputData : [inputData];

        // 4. 读取旧数据（数据库名：postcard）
        const oldData = await kv.get('postcard') || [];

        // 5. 合并数据 (新录入的在前)
        const finalData = [...newItems, ...oldData];

        // 6. 一次性写入 KV
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