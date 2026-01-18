import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  // 允许跨域和设置返回格式
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '仅支持 GET 请求' });
  }

  try {
    // 【关键】这里使用了你确认的键名 'postcard'
    const data = await kv.get('postcard');
    
    // 如果数据库是空的，返回空数组 []
    return res.status(200).json(data || []);
  } catch (error) {
    console.error('KV读取失败:', error);
    return res.status(500).json({ error: '服务端数据库连接失败' });
  }
}