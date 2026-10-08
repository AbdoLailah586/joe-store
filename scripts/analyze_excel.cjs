const xlsx = require('xlsx');
const wb = xlsx.readFile('pyVnA7LPDzn4VTOH8Pe0KKhjKijPlM5bWqjcHyM9euaamNaa27.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const keywords = ['joyroom', 'oraimo', 'anker', 'apple', 't03s', 'jr', 'سماعة', 'airpods', 'شاحن', 'جراب', 'باور', 'ساعة', 'وايرلس', 'screen'];
const matches = {};
keywords.forEach(k => { matches[k] = []; });

for (let i = 3; i < data.length; i++) {
  const r = data[i];
  if (!r || !r[2]) continue;
  const name = String(r[2]).toLowerCase();
  keywords.forEach(k => {
    if (name.includes(k)) {
      matches[k].push({ code: r[1], name: r[2], qty: r[3], price: r[5], cost: r[6], barcode: r[8] });
    }
  });
}

keywords.forEach(k => {
  console.log(`Keyword "${k}": ${matches[k].length} items`);
  if (matches[k].length > 0) {
    console.log('  Samples:', matches[k].slice(0, 3));
  }
});
