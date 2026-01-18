import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    // 限制仅允许 GET 请求
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 从 KV 中获取数据，如果没有数据则返回空数组 []
        const cards = await kv.get('postcard');
        
        // 建议增加一个基础的兜底逻辑
        const data = cards || [];
        
        // 返回 JSON 数据
        return res.status(200).json(data);
    } catch (error) {
        console.error('KV Read Error:', error);
        return res.status(500).json({ error: '无法从数据库读取数据' });
    }
}