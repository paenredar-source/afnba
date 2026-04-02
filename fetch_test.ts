import https from 'https';
const SHEET_ID = '1awwvd85-BLPT45034PjeVLNThIGdDF10XQBtKDBEEXw';
const sheetName = 'SALARIOS EQUIPOS';
const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    const jsonStr = data.substring(data.indexOf('{'), data.lastIndexOf('}') + 1);
    const parsed = JSON.parse(jsonStr);
    const headers = parsed.table.cols.map(c => c ? c.label : '').filter(Boolean);
    console.log('Headers:', headers);
    const firstRow = parsed.table.rows[0].c.map(c => c ? {v: c.v, f: c.f} : null);
    console.log('First Row:', firstRow);
  });
});
