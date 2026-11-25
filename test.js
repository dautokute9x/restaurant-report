// Run: node test.js  (checks the engine inside index.html; prints "ok" when everything passes)
const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/index.html', 'utf8');
html.split('<script>').slice(1).forEach(s => new Function(s.split('</script>')[0]));   // every inline script parses
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

// renamed dine-in channel keeps its average bill
const rows = [{ d: '2026-11-01', cat: 'Pasta', chk: '1', dish: 'X', oc: 'Dine In', ot: 'Dine In', g: 2, q: 1, n: 100000, gr: 108000 }];
const k = E.kpis(E.aggregate({ dish: rows }, { chanMap: Object.assign({}, E.CHANNELS, { 'Dine In': 'Dine-in' }) }));
assert.strictEqual(k.taDI, 100000);

// sample data: every bridge level must add up exactly to the total change
const s = {};
new Function(html.split('<script>')[2].split('</script>')[0]).call(s);   // second <script> is the sample
const X = s.RSample.build();
const cfg = i => { const pr = {}; for (const d in X.prices) pr[d] = { list: i ? X.prices[d].l1 : X.prices[d].l0, vat: X.prices[d].vat }; return { prices: pr, costs: X.costs, comm: i ? X.comm1 : X.comm0, seats: X.seats }; };
const A0 = E.aggregate(X.p0, cfg(0)), A1 = E.aggregate(X.p1, cfg(1));
for (const profit of [false, true]) assert.ok(E.analyze(A0, A1, { profit }).ok, 'bridge sums, profit=' + profit);
assert.ok(A1.recon.every(r => r.ok), 'sample reports reconcile');

console.log('ok');
