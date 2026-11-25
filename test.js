// Run: node test.js  (checks the engine inside index.html; prints "ok" when everything passes)
const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
const m = { exports: {} };
new Function('module', html.split('<script>')[1].split('</script>')[0])(m);   // first <script> is the engine
const E = m.exports;

// numbers: decimal comma, thousands dot, English format
assert.strictEqual(E.num('0,5'), 0.5);
assert.strictEqual(E.num('234,5'), 234.5);
assert.strictEqual(E.num('1,234'), 1234);
assert.strictEqual(E.num('1.234.567,8'), 1234567.8);
assert.strictEqual(E.num('1,234.5'), 1234.5);

// dish rows: text check numbers kept, unreadable sales rows counted as bad, blank/total/footer rows skipped
const H = ['Date', 'Category', 'Check Number', 'Dish', 'Order Category', 'Quantity', 'Net Sales'];
const p = E.parseSheet([H,
  ['2026-11-01', 'Pasta', 'A-0001', 'X', 'Dine In', 1, 100000],
  [null, 'Pasta', 'A-0002', 'X', 'Dine In', 1, 100000],        // no date, has sales -> bad
  ['2026-11-01', 'Pasta', null, 'X', 'Dine In', 1, 100000],      // no check, has sales -> bad
  [null, null, null, null, null, null, null],                    // blank -> skipped
  ['Totals:', null, null, null, null, 2, 200000],                // total -> skipped
  ['In lúc 23/11 bởi admin', null, null, null, null, null, null] // footer -> skipped
]);
assert.strictEqual(p.records.length, 1);
assert.strictEqual(p.records[0].chk, 'A-0001');
assert.strictEqual(p.bad, 2);
assert.strictEqual(p.skipped, 3);

// price template header: VAT must come from the "VAT %" column, not "Giá ... (gồm VAT)"
const tpl = html.match(/ws\.addRow\((\['Món'[^\]]*\])\)/)[1];
const cols = JSON.parse(tpl.replace(/'/g, '"')).map(v => v.toLowerCase());
const vatRe = new RegExp(html.match(/cV = ci\(\/(.+?)\/\)/)[1]);
assert.strictEqual(cols.findIndex(h => vatRe.test(h)), 4);

console.log('ok');
