import { kv } from '@vercel/kv';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { password, newCard } = req.body;

    // 读取你在 Vercel 设置的那个 Key 名
    const securePassword = process.env.ADMIN_PASSWORD;

    // 进行比对
    if (!securePassword || password !== securePassword) {
        return res.status(401).json({ error: '管理口令错误' });
    }

    try {
        let currentCards = await kv.get('postcard') || [];
        currentCards.unshift(newCard);
        await kv.set('postcard', currentCards);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: '数据库写入失败' });
    }
}