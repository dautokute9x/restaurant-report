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

// list price per channel: app markup is not an in-store discount; app deals are measured against the app price
const L = (oc, gr, chk) => ({ d: '2026-11-02', cat: 'Baked', chk: chk, dish: 'Dish A', oc: oc, ot: oc, g: 1, q: 1, n: gr / 1.08, gr: gr });
const gb = [L('Dine In', 100000, '1'), L('Dine In', 100000, '2'), L('Dine In', 50000, '3'), L('Now', 150000, '4'), L('Now', 150000, '5'), L('Now', 75000, '6')];
const lp = E.listPrices(gb, E.NONFOOD);
assert.deepStrictEqual([lp.ch['Dish A|Dine In'], lp.ch['Dish A|Now'], lp.dish['Dish A']], [100000, 150000, 150000]);
let G = E.aggregate({ dish: gb }, {});
assert.ok(Math.abs(G.ch['Tại chỗ'].disc - 50000 / 1.08) < 1, 'in-store discount only on the below-menu sale');
assert.ok(Math.abs(G.ch['ShopeeFood'].disc - 75000 / 1.08) < 1, 'app discount against the app price');
G = E.aggregate({ dish: gb }, { prices: { 'Dish A': { list: 100000, vat: 8 } } });   // menu file holds the in-store price only
assert.ok(Math.abs(G.ch['ShopeeFood'].disc - 75000 / 1.08) < 1, 'menu file does not turn the app markup into a discount');

// level 3: an extra weekend day is weekend mix, not productivity (2026-11-02 Mon, 2026-11-07 Sat, 2026-11-08 Sun)
const bills = (d, n) => Array.from({ length: n }, (_, i) => ({ d: d, cat: 'Pasta', chk: d + i, dish: 'X', oc: 'Dine In', ot: 'Dine In', g: 1, q: 1, n: 100, gr: 108 }));
const R3 = E.analyze(E.aggregate({ dish: bills('2026-11-02', 10).concat(bills('2026-11-07', 30)) }, {}), E.aggregate({ dish: bills('2026-11-07', 30).concat(bills('2026-11-08', 30)) }, {}), {});
assert.ok(R3.ok, 'level 3 still sums to traffic');
assert.ok(Math.abs(R3.L3.prod) < 1e-6 && Math.abs(R3.L3.daymix - 2000) < 1e-6, 'weekend swap shows as weekend mix (+20 bills x 100), productivity 0');

// add-ons (sauce, topping) are not dishes per bill, but their cost still counts
const ad = [{ d: '2026-11-02', cat: 'Pasta', chk: '1', dish: 'X', oc: 'Dine In', ot: 'Dine In', g: 1, q: 1, n: 100000, gr: 108000 },
  { d: '2026-11-02', cat: 'Add sauce', chk: '1', dish: 'Sauce', oc: 'Dine In', ot: 'Dine In', g: 1, q: 2, n: 20000, gr: 21600 }];
const AD = E.aggregate({ dish: ad }, { costs: { X: 30000, Sauce: 3000 } });
assert.strictEqual(AD.items, 1);
assert.strictEqual(AD.food, 36000);

// weekday buckets: 2026-11-02 is a Monday (T2), 2026-11-08 a Sunday (CN); weekend mix is built from them
const WK = E.aggregate({ dish: bills('2026-11-02', 2).concat(bills('2026-11-08', 3)) }, {});
assert.deepStrictEqual(E.byWeekday(WK).map(x => x.tc), [2, 0, 0, 0, 0, 0, 3]);

console.log('ok');
