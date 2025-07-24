import { useState } from 'react'
import './App.css'
import React from 'react';

function App() {
  // 入力用のstate
  const [requirements, setRequirements] = useState('');
  const [rent, setRent] = useState('選択して下さい',);
  const [layout, setLayout] = useState('選択して下さい',);
  const [age, setAge] = useState('選択して下さい',);
  const [walk, setWalk] = useState('選択して下さい',);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [propertyItems, setPropertyItems] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  // セレクトの選択肢
  const rentOptions = [
    '選択して下さい', '5万円以内', '7.5万円以内', '10万円以内', '12.5万円以内', '15万円以内',
    '17.5万円以内', '20万円以内', '22.5万円以内', '25万円以内', '27.5万円以内',
    '30万円以内', '32.5万円以内', '35万円以内', '35万円以上'
  ];
  const layoutOptions = [
    '選択して下さい','1K', '1DK', '1LDK', '2K', '2DK', '2LDK',
    '3K', '3DK', '3LDK', '4K', '4DK', '4LDK', '4LDK以上'
  ];
  const ageOptions = [
    '選択して下さい','新築', '3年以内', '5年以内', '10年以内', '15年以内',
    '20年以内', '25年以内', '30年以内'
  ];
  const walkOptions = [
    '選択して下さい','1分以内', '5分以内', '7分以内', '10分以内', '15分以内', '20分以内', '30分以内'
  ];

  // ChatGPTの回答から表データを抽出する関数
  function parseTableFromResponse(response) {
    // Markdownテーブルまたはテキスト表を抽出
    const tableRegex = /((\|.+)+\|.+\n)([\|\- :]+\n)(([\|].+\n?)+)/;
    const match = response.match(tableRegex);
    if (!match) return null;
    const tableText = match[0];
    const lines = tableText.trim().split('\n').filter(Boolean);
    if (lines.length < 3) return null;
    // 1行目: ヘッダー, 2行目: 区切り, 3行目以降: データ
    const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
    const rows = lines.slice(2).map(line => line.split('|').map(cell => cell.trim()).filter(Boolean));
    return { headers, rows };
  }

  // テーブル以外のテキスト部分を抽出
  function extractNonTableText(response) {
    const tableRegex = /((\|.+)+\|.+\n)([\|\- :]+\n)(([\|].+\n?)+)/;
    return response.replace(tableRegex, '').trim();
  }

  // 物件リスト（searchText）をテーブルに変換する関数
  function parsePropertyListToTable(searchText) {
    if (!searchText) return null;
    // 物件ごとに分割
    const items = searchText.split(/\n\n+/).filter(Boolean);
    // ヘッダー
    const headers = ['No.', 'タイトル', 'URL', '説明'];
    // データ行
    const rows = items.map((item, i) => {
      const titleMatch = item.match(/タイトル: (.+)/);
      const urlMatch = item.match(/URL: (.+)/);
      const descMatch = item.match(/説明: (.+)/);
      return [
        i + 1,
        titleMatch ? titleMatch[1] : '',
        urlMatch ? urlMatch[1] : '',
        descMatch ? descMatch[1] : '',
      ];
    });
    return { headers, rows };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResponse('');
    setError('');
    setLoading(true);
    setPropertyItems([]);
    try {
      // 1. バックエンドAPIから物件情報とGemini AIの回答を取得
      const params = new URLSearchParams({
        requirements,
        rent,
        layout,
        age,
        walk,
      });
      const propRes = await fetch(`http://localhost:3001/api/search?${params.toString()}`);
      const propData = await propRes.json();
      
      if (!propData.success) {
        throw new Error(propData.error || 'APIリクエストに失敗しました');
      }
      
      setSearchText(propData.searchText || '');
      setSearchKeyword(propData.searchKeyword || '');
      setResponse(propData.result || '回答が取得できませんでした');
    } catch (err) {
      setError('エラーが発生しました: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="estate-app">
      <h1>賃貸物件提案アプリ</h1>
      <form onSubmit={handleSubmit} className="estate-form">
        <div>
          <label>要件（200文字以内）<br/>
            <textarea
              value={requirements}
              onChange={e => setRequirements(e.target.value.slice(0, 200))}
              maxLength={200}
              rows={4}
              cols={40}
              required
            />
          </label>
        </div>
        <div>
          <label>賃料
            <select value={rent} onChange={e => setRent(e.target.value)}>
              {rentOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
        </div>
        <div>
          <label>間取り
            <select value={layout} onChange={e => setLayout(e.target.value)}>
              {layoutOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
        </div>
        <div>
          <label>築年数
            <select value={age} onChange={e => setAge(e.target.value)}>
              {ageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
        </div>
        <div>
          <label>駅徒歩
            <select value={walk} onChange={e => setWalk(e.target.value)}>
              {walkOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </label>
        </div>
        <div style={{marginTop: '1em'}}>
          <button type="submit">調べる</button>
        </div>
      </form>
      {/* 物件リスト表示 */}
      {searchText && (
        <div className="search-text-section" style={{marginTop: '2em'}}>
        </div>
      )}
      {loading && <div style={{marginTop: '2em', color: '#888'}}>物件情報を検索中...</div>}
      {error && <div style={{marginTop: '2em', color: 'red'}}>{error}</div>}
      {/* AIからの物件提案を表示 */}
      {response && (
        <div className="response-section" style={{marginTop: '2em'}}>
          <h2>AIからの物件提案</h2>
          {parseTableFromResponse(response) ? (
            <div style={{overflowX: 'auto', marginBottom: '1em'}}>
              <table style={{borderCollapse: 'collapse', width: '100%'}}>
                <thead>
                  <tr>
                    {parseTableFromResponse(response).headers.map((header, i) => (
                      <th key={i} style={{border: '1px solid #ccc', padding: '6px', background: '#f0f0f0'}}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {parseTableFromResponse(response).rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => {
                        const header = parseTableFromResponse(response).headers[j] || '';
                        const isUrl = (header.includes('URL') || header.toLowerCase().includes('url')) && /^https?:\/\//.test(cell);
                        return (
                          <td key={j} style={{border: '1px solid #ccc', padding: '6px'}}>
                            {isUrl ? (
                              <a href={cell} target="_blank" rel="noopener noreferrer">{cell}</a>
                            ) : cell}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {/* テーブル以外のテキストも表示 */}
          <pre style={{whiteSpace: 'pre-wrap', background: '#f4f4f4', padding: '1em', borderRadius: '8px'}}>{extractNonTableText(response)}</pre>
        </div>
      )}
    </div>
  );
}

export default App
