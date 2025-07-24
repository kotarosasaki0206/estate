const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());

app.get('/api/search', async (req, res) => {
  const { requirements = '', rent = '', layout = '', age = '', walk = '' } = req.query;
  try {
    // 1. Google Search APIで物件情報を最大100件取得
    const searchKeyword = `賃貸 ${rent} ${layout} ${age} ${walk}`.replace(/選択して下さい/g, '').trim();
    let allItems = [];
    for (let i = 0; i < 10; i++) {
      const start = 1 + i * 10;
      const searchUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(searchKeyword + ' 賃貸マンション')}&num=10&start=${start}`;
      const searchRes = await axios.get(searchUrl);
      if (searchRes.data && Array.isArray(searchRes.data.items)) {
        allItems = allItems.concat(searchRes.data.items);
      }
      // APIの無料枠節約のため、itemsが10件未満なら終了
      if (!searchRes.data.items || searchRes.data.items.length < 10) break;
    }
    
    // 検索結果の安全性チェック
    if (!allItems || !Array.isArray(allItems)) {
      console.log('検索結果が空または無効です:', allItems);
      return res.json({ 
        success: true, 
        result: '申し訳ございませんが、現在検索結果が見つかりませんでした。別のキーワードでお試しください。' 
      });
    }
    
    // 2. 検索結果をテキスト化
    const searchText = allItems.slice(0, 100).map((item, i) => {
      if (!item || !item.title || !item.link || !item.snippet) {
        return `${i+1}. タイトル: 情報なし\n  URL: 情報なし\n  説明: 情報なし`;
      }
      return `${i+1}. タイトル: ${item.title}\n  URL: ${item.link}\n  説明: ${item.snippet}`;
    }).join('\n\n');

    // 3. Gemini APIで要約・提案（プロンプトを明確化）
    const geminiPrompt = `あなたは不動産エージェントです。以下の物件リストから、要望に沿った最適な5件を選び、表で提案してください。表の項目は
    タイトル、物件詳細URL、市区町村、この市区町村が良い理由です。

【物件リスト】
${searchText}

要望：${requirements}
賃料：${rent}
間取り：${layout}
築年数：${age}
駅徒歩：${walk}

※このリスト以外の物件や情報は使わず、上記リストからのみ選んでください。
※要望は、市区町村、賃料、間取り、築年月、最寄駅を判断する材料として、リストだけでなく、オープンデータも参考にして下さい
※物件詳細URLに「chintai」が含まれていないまたは「list」が含まれている場合は、提案から外して、他の物件リストから再度ご提案してください。
※値段、間取、築年数、最寄駅、駅徒歩時間のいずれかが取得できない場合は、提案から外して、他の物件リストから再度ご提案してください。
※上記を繰り返して、最終的に5件をご提案ください
`;

    const geminiRes = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        contents: [{ parts: [{ text: geminiPrompt }] }]
      }
    );
    
    // Gemini APIレスポンスの安全性チェック
    if (!geminiRes.data || !geminiRes.data.candidates || !Array.isArray(geminiRes.data.candidates) || geminiRes.data.candidates.length === 0) {
      console.log('Gemini APIレスポンスが無効です:', geminiRes.data);
      return res.json({ 
        success: true, 
        result: '申し訳ございませんが、AIの応答を取得できませんでした。しばらく時間をおいてから再度お試しください。' 
      });
    }
    
    const geminiText = geminiRes.data.candidates[0]?.content?.parts?.[0]?.text || '回答が取得できませんでした';

    res.json({ success: true, result: geminiText, searchText, searchKeyword });
  } catch (err) {
    console.error('APIエラー:', err);
    if (err.response) {
      console.error('APIエラー詳細:', {
        status: err.response.status,
        data: err.response.data,
        message: err.message
      });
    } else {
      console.error('APIエラー詳細:', err.message);
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`LIFULL scraper API (Google Search + Gemini) listening on port ${PORT}`);
}); 