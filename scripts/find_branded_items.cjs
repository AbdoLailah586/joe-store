const xlsx = require('xlsx');
const fs = require('fs');

const wb = xlsx.readFile('pyVnA7LPDzn4VTOH8Pe0KKhjKijPlM5bWqjcHyM9euaamNaa27.xlsx');
const sheet = wb.Sheets[wb.SheetNames[0]];
const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

const rawItems = [];
for (let i = 3; i < data.length; i++) {
  const r = data[i];
  if (!r || !r[2]) continue;
  const code = r[1];
  const name = String(r[2]).trim();
  const qty = Number(r[3]) || 0;
  const sellPrice = Number(r[5]) || 0;
  const costPrice = Number(r[6]) || 0;
  const barcode = r[8] ? String(r[8]).trim() : '';

  rawItems.push({ code, name, qty, sellPrice, costPrice, barcode });
}

console.log('Total raw items:', rawItems.length);

// Find Joyroom items
const joyroomItems = rawItems.filter(i => /joyroom|jr\b/i.test(i.name));
console.log('Joyroom items found:', joyroomItems.length);
joyroomItems.slice(0, 10).forEach(i => console.log('  ', i.code, i.name, i.sellPrice, i.qty));

// Find Oraimo items
const oraimoItems = rawItems.filter(i => /oraimo/i.test(i.name));
console.log('Oraimo items found:', oraimoItems.length);
oraimoItems.slice(0, 10).forEach(i => console.log('  ', i.code, i.name, i.sellPrice, i.qty));

// Find Anker items
const ankerItems = rawItems.filter(i => /anker/i.test(i.name));
console.log('Anker items found:', ankerItems.length);
ankerItems.slice(0, 10).forEach(i => console.log('  ', i.code, i.name, i.sellPrice, i.qty));
