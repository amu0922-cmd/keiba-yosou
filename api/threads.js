// Threads API プロキシ
// 環境変数: THREADS_ACCESS_TOKEN, THREADS_USER_ID
// 使い方:
//   GET /api/threads?action=posts            -> 自分の投稿一覧 + インサイト
//   GET /api/threads?action=replies&id=xxx    -> 指定投稿へのリプライ一覧
//   POST /api/threads?action=hide_reply&id=xxx&hide=true -> リプライ非表示/表示切替

const BASE = 'https://graph.threads.net/v1.0';

export default async function handler(req, res) {
  const TOKEN = process.env.THREADS_ACCESS_TOKEN;
  const USER_ID = process.env.THREADS_USER_ID;

  if (!TOKEN || !USER_ID) {
    return res.status(500).json({ error: 'THREADS_ACCESS_TOKEN または THREADS_USER_ID が設定されていません' });
  }

  const { action, id, hide } = req.query;

  try {
    if (action === 'posts') {
      // 自分の投稿一覧（最新25件）
      const fields = 'id,text,timestamp,permalink,media_type,media_url,children{media_type,media_url}';
      const url = `${BASE}/${USER_ID}/threads?fields=${fields}&limit=25&access_token=${TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();

      if (data.error) {
        return res.status(400).json({ error: data.error.message });
      }

      const posts = data.data || [];

      // 各投稿のインサイトを並行取得
      const withInsights = await Promise.all(
        posts.map(async (post) => {
          try {
            const insightsUrl = `${BASE}/${post.id}/insights?metric=views,likes,replies,reposts,quotes&access_token=${TOKEN}`;
            const ir = await fetch(insightsUrl);
            const idata = await ir.json();
            const metrics = {};
            (idata.data || []).forEach((m) => {
              const val = m.values && m.values[0] ? m.values[0].value : 0;
              metrics[m.name] = val;
            });
            return { ...post, metrics };
          } catch (e) {
            return { ...post, metrics: {} };
          }
        })
      );

      return res.status(200).json({ posts: withInsights });
    }

    if (action === 'replies') {
      if (!id) return res.status(400).json({ error: 'idパラメータが必要です' });

      const fields = 'id,text,username,timestamp,permalink,is_reply,hide_status';
      const url = `${BASE}/${id}/replies?fields=${fields}&access_token=${TOKEN}`;
      const r = await fetch(url);
      const data = await r.json();

      if (data.error) {
        return res.status(400).json({ error: data.error.message });
      }

      return res.status(200).json({ replies: data.data || [] });
    }

    if (action === 'hide_reply') {
      if (!id) return res.status(400).json({ error: 'idパラメータが必要です' });
      if (req.method !== 'POST') return res.status(405).json({ error: 'POSTメソッドのみ対応' });

      const hideValue = hide === 'true' || hide === '1';
      const url = `${BASE}/${id}/manage_reply?hide=${hideValue}&access_token=${TOKEN}`;
      const r = await fetch(url, { method: 'POST' });
      const data = await r.json();

      if (data.error) {
        return res.status(400).json({ error: data.error.message });
      }

      return res.status(200).json({ success: true, hidden: hideValue });
    }

    return res.status(400).json({ error: '不明なaction' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
