const fs = require('fs');

console.log('Building full seed products file...');

const excelProducts = JSON.parse(fs.readFileSync('src/data/allExcelProducts.json', 'utf8'));
console.log(`Loaded ${excelProducts.length} excel products.`);

// Read existing flagship products from seedProducts.ts
const currentSeed = fs.readFileSync('src/data/seedProducts.ts', 'utf8');

// Find where the 12th flagship product ends
const lastFlagshipMarker = "id: 'prod-cover-pitaka'";
const lastFlagshipIdx = currentSeed.indexOf(lastFlagshipMarker);
if (lastFlagshipIdx === -1) {
  console.error('Could not find marker in current seedProducts.ts');
  process.exit(1);
}

// Find the closing brace of prod-cover-pitaka
const closingBraceIdx = currentSeed.indexOf('  }', lastFlagshipIdx);
const endOfFlagships = closingBraceIdx + 3;

const flagshipsPart = currentSeed.slice(0, endOfFlagships);

// Flagship IDs & SKUs to avoid duplication
const flagshipKeys = new Set([
  'prod-joyroom-jr-t03s-plus',
  'prod-joyroom-jr-t03s-pro',
  'prod-oraimo-spacebuds-lite',
  'prod-anker-liberty-5',
  'prod-anker-p40i',
  'prod-joyroom-cable-fast',
  'prod-joyroom-screen-hd',
  'prod-iphone-15-pro-max',
  'prod-iphone-13-mint',
  'prod-anker-prime-67w',
  'prod-anker-plug-20w',
  'prod-cover-pitaka',
  'B0CH8G5DL8',
  'JR-T03S-PLUS-WHT'
]);

// Filter out duplicates from excelProducts
const uniqueExcelProducts = excelProducts.filter(p => !flagshipKeys.has(p.id) && !flagshipKeys.has(p.sku) && !flagshipKeys.has(p.asin));
console.log(`Unique excel products to append: ${uniqueExcelProducts.length}`);

// We will write src/data/allExcelProducts.json and export combined in seedProducts.ts:
const newSeedProductsTs = `${flagshipsPart},
  // ==============================================================
  // ALL 2,233 PRODUCTS IMPORTED FROM JOE STORE EXCEL INVENTORY
  // ==============================================================
` + uniqueExcelProducts.map(p => `  ${JSON.stringify(p)}`).join(',\n') + '\n];\n';

fs.writeFileSync('src/data/seedProducts.ts', newSeedProductsTs, 'utf8');

const fileSizeMb = (fs.statSync('src/data/seedProducts.ts').size / 1024 / 1024).toFixed(2);
console.log(`Successfully generated src/data/seedProducts.ts! File size: ${fileSizeMb} MB`);
