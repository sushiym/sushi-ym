//@@ PART A: top of the main script
/* ===== DEMO VERSION: no cloud, no real data. Everything lives in this browser only ===== */
const DEMO = {pfx:"ymdemo:", dbKey:"db:v1", pinAdmin:"1111", pinWorker:"2222"};
// own storage keys (prefix), so the demo never touches the working program's saved login, language or device id
const DEMO_LS = (() => {
  let st = null; try { st = window.localStorage; st.getItem(DEMO.pfx + "probe"); } catch(e){ st = null; }
  const mem = {};
  return {
    getItem: k => { try { if (st){ const v = st.getItem(DEMO.pfx + k); if (v !== null) return v; } } catch(e){} return k in mem ? mem[k] : null; },
    setItem: (k, v) => { v = String(v); mem[k] = v; try { if (st) st.setItem(DEMO.pfx + k, v); return true; } catch(e){ return false; } },
    removeItem: k => { delete mem[k]; try { if (st) st.removeItem(DEMO.pfx + k); } catch(e){} }
  };
})();
const DEMO_NOAUTH = {signOut: () => Promise.resolve(), signInWithEmailAndPassword: () => Promise.reject({code:"demo"})};
const DEMO_I18N = {
  "Демо-версия: данные выдуманные и хранятся только в этом браузере.": ["Demo version: the data is made up and is kept only in this browser.", "Demo sürümü: veriler örnektir ve yalnızca bu tarayıcıda saklanır."],
  "Сбросить демо": ["Reset demo", "Demoyu sıfırla"],
  "Демо-версия.": ["Demo version.", "Demo sürümü."],
  "PIN админа:": ["Admin PIN:", "Yönetici PIN:"],
  "PIN работников:": ["Staff PIN:", "Çalışan PIN:"],
  "Можно нажимать что угодно: всё хранится только в этом браузере.": ["Click anything you like: everything is kept only in this browser.", "İstediğiniz her şeye basabilirsiniz: her şey yalnızca bu tarayıcıda saklanır."],
  "Сбросить демо? Все изменения в демо-версии сотрутся, вернутся примерные данные.": ["Reset the demo? All changes in the demo will be erased and the sample data will come back.", "Demo sıfırlansın mı? Demodaki tüm değişiklikler silinir, örnek veriler geri gelir."],
  "Демо-версия работает без сохранения: браузер не даёт места. После перезагрузки данные вернутся к примерным.": ["The demo runs without saving: the browser gives no storage. After a reload the sample data comes back.", "Demo kayıtsız çalışıyor: tarayıcı yer vermiyor. Yeniden yüklemede örnek veriler geri gelir."]
};
//@@ PART B: replaces the Firebase config and the cloud database layer
/* ---------- start (DEMO: local database in this browser, no cloud) ---------- */
let FS = null, writeErrShown = 0;
function writeErr(e){ console.error(e); }
const DEMO_DB = {cols:{}, subs:{}, dirty:new Set(), pend:false, t:0, off:false, warned:false};
function demoSave(){
  if (DEMO_DB.off) return;
  clearTimeout(DEMO_DB.t);
  DEMO_DB.t = setTimeout(() => {
    if (DEMO_DB.off) return;
    if (!DEMO_LS.setItem(DEMO.dbKey, JSON.stringify(DEMO_DB.cols)) && !DEMO_DB.warned){
      DEMO_DB.warned = true; toast("Демо-версия работает без сохранения: браузер не даёт места. После перезагрузки данные вернутся к примерным.");
    }
  }, 300);
}
function demoSnap(col){ return Object.entries(DEMO_DB.cols[col] || {}).map(([id, d]) => ({id, data: () => JSON.parse(JSON.stringify(d))})); }
function demoEmit(col){
  DEMO_DB.dirty.add(col); if (DEMO_DB.pend) return; DEMO_DB.pend = true;
  setTimeout(() => { DEMO_DB.pend = false; const cs = [...DEMO_DB.dirty]; DEMO_DB.dirty.clear(); cs.forEach(c => (DEMO_DB.subs[c] || []).forEach(cb => cb(demoSnap(c)))); }, 0);
}
function makeDb(){
  return {
    collection: name => ({ onSnapshot(cb){ (DEMO_DB.subs[name] = DEMO_DB.subs[name] || []).push(cb); setTimeout(() => cb(demoSnap(name)), 0); return () => {}; } }),
    doc: path => { const i = path.indexOf("/"), col = path.slice(0, i), id = path.slice(i + 1); return {
      set: d => { (DEMO_DB.cols[col] = DEMO_DB.cols[col] || {})[id] = JSON.parse(JSON.stringify(d)); demoEmit(col); demoSave(); return Promise.resolve(); },
      delete: () => { if (DEMO_DB.cols[col]) delete DEMO_DB.cols[col][id]; demoEmit(col); demoSave(); return Promise.resolve(); } }; }
  };
}
//@@ PART C: replaces the Firebase start
/* ---------- DEMO: sample data (made up), rebuilt relative to today on first start and on «Сбросить демо» ---------- */
function demoGateHint(){
  return `<div class="demohint"><b>Демо-версия.</b> PIN админа: <b translate="no">${DEMO.pinAdmin}</b>, PIN работников: <b translate="no">${DEMO.pinWorker}</b>.<br><small>Можно нажимать что угодно: всё хранится только в этом браузере.</small> <button type="button" class="btn small" data-demoreset>Сбросить демо</button></div>`;
}
document.addEventListener("click", e => {
  if (!e.target.closest("[data-demoreset]")) return;
  if (!tConfirm("Сбросить демо? Все изменения в демо-версии сотрутся, вернутся примерные данные.")) return;
  DEMO_DB.off = true; clearTimeout(DEMO_DB.t);
  DEMO_LS.removeItem(DEMO.dbKey); DEMO_LS.removeItem("sushi.me"); DEMO_LS.removeItem("sklad.who");
  location.reload();
});
async function demoSeed(){
  let seed = 20261016; const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), pick = a => a[Math.floor(rnd() * a.length)];
  const wpick = list => { const s = list.reduce((a, x) => a + x[1], 0); let r = rnd() * s; for (const x of list){ r -= x[1]; if (r <= 0) return x[0]; } return list[0][0]; };
  const r2 = n => Math.round(n * 100) / 100, r3 = n => Math.round(n * 1000) / 1000;
  const DAY = 86400000, now = Date.now(), d0 = new Date(); d0.setHours(0, 0, 0, 0); const today = d0.getTime();
  const at = (day, h, m) => { const d = new Date(today); d.setDate(d.getDate() + day); d.setHours(h, m || 0, 0, 0); return d.getTime(); };
  let idn = 0; const id = p => p + "demo" + (++idn).toString(36);

  /* products: id, category, unit, purchase price ₺, min, usual purchase, RU, EN, TR */
  const P = [
    ["p01","Рыба и морепродукты","кг",950,0,6,"Лосось охлаждённый (целый)","Salmon, chilled (whole)","Somon, taze (bütün)"],
    ["p02","Рыба и морепродукты","шт",60,0,0,"Рыбный набор для ухи","Fish set for ukha soup","Uha çorbası için balık seti"],
    ["p_salmon_fillet","Рыба и морепродукты","кг",1350,1,4,"Лосось филе","Salmon fillet","Somon fileto"],
    ["ptuna","Рыба и морепродукты","кг",1500,0.5,2,"Тунец филе","Tuna fillet","Ton balığı fileto"],
    ["pshrimp","Рыба и морепродукты","кг",850,0.5,2,"Креветки тигровые","Tiger prawns","Kaplan karides"],
    ["peel","Рыба и морепродукты","кг",2200,0.3,1,"Угорь копчёный","Smoked eel","Füme yılan balığı"],
    ["pmasago","Рыба и морепродукты","кг",1600,0.2,0.5,"Икра масаго","Masago roe","Masago havyarı"],
    ["pcrab","Рыба и морепродукты","кг",320,0.5,2,"Крабовые палочки","Crab sticks","Yengeç çubuğu"],
    ["pchicken","Мясо и птица","кг",230,1,5,"Курица филе","Chicken fillet","Tavuk fileto"],
    ["pbeef","Мясо и птица","кг",600,1,4,"Говядина","Beef","Dana eti"],
    ["pmince","Мясо и птица","кг",560,1,4,"Фарш говяжий","Minced beef","Dana kıyma"],
    ["pcheese","Молочные и яйца","кг",450,1,3,"Сливочный сыр","Cream cheese","Krem peynir"],
    ["pegg","Молочные и яйца","шт",6,30,90,"Яйца","Eggs","Yumurta"],
    ["psmetana","Молочные и яйца","кг",160,0.5,2,"Сметана","Sour cream","Ekşi krema"],
    ["pcucumber","Овощи и фрукты","кг",45,1,5,"Огурцы","Cucumbers","Salatalık"],
    ["pavocado","Овощи и фрукты","кг",260,1,4,"Авокадо","Avocado","Avokado"],
    ["ponion","Овощи и фрукты","кг",22,1,5,"Лук репчатый","Onions","Kuru soğan"],
    ["pcarrot","Овощи и фрукты","кг",25,1,5,"Морковь","Carrots","Havuç"],
    ["plemon","Овощи и фрукты","кг",60,0.5,2,"Лимон","Lemons","Limon"],
    ["ppotato","Овощи и фрукты","кг",20,2,10,"Картофель","Potatoes","Patates"],
    ["pbeet","Овощи и фрукты","кг",25,1,5,"Свёкла","Beetroot","Pancar"],
    ["pcabbage","Овощи и фрукты","кг",18,1,5,"Капуста","Cabbage","Lahana"],
    ["price","Бакалея","кг",110,5,25,"Рис для суши","Sushi rice","Suşi pirinci"],
    ["pnori","Бакалея","лист",4.5,100,500,"Нори","Nori","Nori"],
    ["pflour","Бакалея","кг",25,3,10,"Мука","Flour","Un"],
    ["ppanko","Бакалея","кг",180,0.5,2,"Панко","Panko","Panko"],
    ["psesame","Бакалея","кг",210,0.3,1,"Кунжут","Sesame","Susam"],
    ["psugar","Бакалея","кг",40,1,5,"Сахар","Sugar","Şeker"],
    ["psalt","Бакалея","кг",10,0.5,3,"Соль","Salt","Tuz"],
    ["poil","Бакалея","л",95,2,10,"Масло растительное","Vegetable oil","Ayçiçek yağı"],
    ["ptea","Бакалея","кг",420,0.2,1,"Чай чёрный","Black tea","Siyah çay"],
    ["psoy","Соусы и приправы","л",160,2,6,"Соевый соус","Soy sauce","Soya sosu"],
    ["pvinegar","Соусы и приправы","л",220,1,3,"Уксус рисовый","Rice vinegar","Pirinç sirkesi"],
    ["pmirin","Соусы и приправы","л",300,0.5,2,"Мирин","Mirin","Mirin"],
    ["pmayo","Соусы и приправы","кг",140,1,4,"Майонез","Mayonnaise","Mayonez"],
    ["psriracha","Соусы и приправы","л",350,0.3,1,"Шрирача","Sriracha","Sriracha"],
    ["pwasabi","Соусы и приправы","кг",600,0.2,1,"Васаби","Wasabi","Wasabi"],
    ["pginger","Соусы и приправы","кг",250,0.5,2,"Имбирь маринованный","Pickled ginger","Zencefil turşusu"],
    ["ptompaste","Соусы и приправы","кг",900,0.2,1,"Паста том ям","Tom yum paste","Tom yum ezmesi"],
    ["pcoconut","Соусы и приправы","л",180,1,6,"Кокосовое молоко","Coconut milk","Hindistan cevizi sütü"],
    ["zrice","Заготовки","кг",0,2,0,"Рис для суши (готовый)","Sushi rice (cooked)","Suşi pirinci (pişmiş)"],
    ["zspicy","Заготовки","кг",0,0.3,0,"Спайси соус","Spicy sauce","Acılı sos"],
    ["zunagi","Заготовки","л",0,0.3,0,"Соус унаги","Unagi sauce","Unagi sosu"],
    ["ztomyam","Заготовки","л",0,1,0,"Бульон том ям","Tom yum broth","Tom yum suyu"],
    ["zborsch","Заготовки","л",0,1,0,"Борщ","Borscht","Borş çorbası"],
    ["zdough","Заготовки","кг",0,0.5,0,"Тесто для пельменей","Pelmeni dough","Mantı hamuru"],
    ["pcheesecake","Десерты","шт",65,4,12,"Чизкейк","Cheesecake","Cheesecake"],
    ["pcola","Напитки","шт",25,12,48,"Кола 0,33","Cola 0.33","Kola 0,33"],
    ["payran","Напитки","шт",12,12,40,"Айран","Ayran","Ayran"],
    ["pwater","Напитки","шт",6,12,48,"Вода 0,5","Water 0.5","Su 0,5"],
    ["kbox","Упаковка","шт",4,50,200,"Контейнер для роллов","Roll container","Rulo kabı"],
    ["ksoup","Упаковка","шт",5,20,100,"Контейнер для супа","Soup container","Çorba kabı"],
    ["kbag","Упаковка","шт",1.5,50,200,"Пакет","Bag","Poşet"],
    ["kchop","Упаковка","шт",0.8,100,400,"Палочки","Chopsticks","Yemek çubuğu"]
  ];
  const products = P.map((x, i) => ({id:x[0], name:x[6], name_en:x[7], name_tr:x[8], desc:"", category:x[1], unit:x[2], min:x[4], active:true, track:true,
    yieldPct: x[0]==="p01" ? 75 : 100, cost:x[3], order:i}));
  const buyOf = {}; P.forEach(x => buyOf[x[0]] = x[5]);
  const recipes = [
    {id:"zrice", productId:"zrice", yield:2, items:[{productId:"price",qty:1},{productId:"pvinegar",qty:0.12},{productId:"psugar",qty:0.06},{productId:"psalt",qty:0.02}]},
    {id:"zspicy", productId:"zspicy", yield:1, items:[{productId:"pmayo",qty:0.8},{productId:"psriracha",qty:0.2}]},
    {id:"zunagi", productId:"zunagi", yield:1, items:[{productId:"psoy",qty:0.5},{productId:"psugar",qty:0.3},{productId:"pmirin",qty:0.3}]},
    {id:"ztomyam", productId:"ztomyam", yield:5, items:[{productId:"ptompaste",qty:0.25},{productId:"pcoconut",qty:1.5},{productId:"plemon",qty:0.2},{productId:"pchicken",qty:0.3}]},
    {id:"zborsch", productId:"zborsch", yield:6, items:[{productId:"pbeet",qty:0.8},{productId:"pcabbage",qty:0.8},{productId:"ppotato",qty:0.8},{productId:"pcarrot",qty:0.3},{productId:"ponion",qty:0.2},{productId:"pbeef",qty:0.8}]},
    {id:"zdough", productId:"zdough", yield:1.5, items:[{productId:"pflour",qty:1},{productId:"pegg",qty:2},{productId:"psalt",qty:0.01}]}
  ];
  /* menu: id, category, price, RU, EN, TR, recipe card, own packaging (null = standard) */
  const M = [
    ["dphila","Роллы",520,"Филадельфия","Philadelphia roll","Philadelphia rulo",[["zrice",.12],["p_salmon_fillet",.09],["pcheese",.04],["pnori",.5],["pcucumber",.02]]],
    ["dcali","Роллы",480,"Калифорния","California roll","California rulo",[["zrice",.12],["pcrab",.05],["pavocado",.03],["pcucumber",.02],["pmasago",.02],["pnori",.5]]],
    ["ddragon","Роллы",650,"Дракон с угрём","Dragon roll with eel","Yılan balıklı Dragon rulo",[["zrice",.12],["peel",.06],["pavocado",.04],["pcheese",.03],["zunagi",.02],["psesame",.003],["pnori",.5]]],
    ["dspicy","Роллы",560,"Спайси тунец","Spicy tuna roll","Acılı ton balığı rulo",[["zrice",.12],["ptuna",.08],["zspicy",.03],["pcucumber",.02],["pnori",.5]]],
    ["dtempura","Роллы",540,"Темпура с креветкой","Shrimp tempura roll","Karidesli tempura rulo",[["zrice",.12],["pshrimp",.06],["ppanko",.02],["pflour",.02],["pegg",.3],["poil",.03],["pcheese",.03],["zunagi",.02],["pnori",.5]]],
    ["dveggie","Роллы",320,"Овощной ролл","Veggie roll","Sebzeli rulo",[["zrice",.12],["pcucumber",.03],["pavocado",.04],["pcarrot",.02],["pnori",.5]]],
    ["dmaki","Роллы",280,"Маки с лососем","Salmon maki","Somonlu maki",[["zrice",.08],["p_salmon_fillet",.04],["pnori",.5]]],
    ["dsush1","Суши",220,"Суши с лососем (2 шт)","Salmon nigiri (2 pcs)","Somonlu nigiri (2 adet)",[["zrice",.04],["p_salmon_fillet",.03],["pwasabi",.002]]],
    ["dsush2","Суши",240,"Суши с тунцом (2 шт)","Tuna nigiri (2 pcs)","Ton balıklı nigiri (2 adet)",[["zrice",.04],["ptuna",.03],["pwasabi",.002]]],
    ["dsush3","Суши",260,"Суши с угрём (2 шт)","Eel nigiri (2 pcs)","Yılan balıklı nigiri (2 adet)",[["zrice",.04],["peel",.03],["zunagi",.005],["pnori",.1]]],
    ["dtomyam","Супы",380,"Том ям с креветками","Tom yum with prawns","Karidesli tom yum",[["ztomyam",.35],["pshrimp",.06],["plemon",.02]],[["ksoup",1]]],
    ["dborsch","Супы",260,"Борщ","Borscht","Borş çorbası",[["zborsch",.35],["psmetana",.03]],[["ksoup",1]]],
    ["dukha","Супы",300,"Уха","Ukha fish soup","Uha balık çorbası",[["p02",.25],["p_salmon_fillet",.03],["ppotato",.08],["pcarrot",.03],["ponion",.02]],[["ksoup",1]]],
    ["dpelmeni","Горячее",320,"Пельмени (12 шт)","Pelmeni (12 pcs)","Pelmeni (12 adet)",[["zdough",.12],["pmince",.1],["ponion",.02],["psmetana",.03]]],
    ["dteriyaki","Вок",360,"Курица терияки с рисом","Chicken teriyaki with rice","Pilavlı tavuk teriyaki",[["pchicken",.15],["zrice",.15],["zunagi",.03],["psesame",.003]]],
    ["dcheesecake","Десерты",180,"Чизкейк","Cheesecake","Cheesecake",[["pcheesecake",1]]],
    ["dcola","Напитки",80,"Кола 0,33","Cola 0.33","Kola 0,33",[["pcola",1]],[]],
    ["dayran","Напитки",50,"Айран","Ayran","Ayran",[["payran",1]],[]],
    ["dwater","Напитки",30,"Вода 0,5","Water 0.5","Su 0,5",[["pwater",1]],[]],
    ["dtea","Чай",40,"Чай чёрный","Black tea","Siyah çay",[["ptea",.003]],[]]
  ];
  const menu = M.map((x, i) => ({id:x[0], method:"", name:x[3], name_en:x[4], name_tr:x[5], needsWork:false, todo:"", category:x[1], active:true,
    items:x[6].map(([productId, qty]) => ({productId, qty})), price:x[2], packMode: x[7] ? "custom" : "default", pack: (x[7] || []).map(([productId, qty]) => ({productId, qty})), order:i + 1}));
  const sets = [{id:"sclassic", name:"Сет «Классика»", name_en:"Set “Classic”", name_tr:"“Klasik” set", needsWork:false, todo:"", active:true,
    items:[{dishId:"dphila",qty:1},{dishId:"dcali",qty:1},{dishId:"dmaki",qty:1}], price:1150, packMode:"default", pack:[], order:1}];
  const settings = [{id:"pack", perOrder:[{productId:"kbag",qty:1},{productId:"kchop",qty:2}], perItem:[{productId:"kbox",qty:1}]}];

  /* staff: one admin and three workers (made-up names) */
  const staff = [
    {id:"udemoadmin", name:"Kemal", role:"admin", active:true, createdAt:at(-40, 9)},
    {id:"udemoayse", name:"Ayşe", role:"worker", active:true, rate:150, createdAt:at(-40, 9)},
    {id:"udemoelif", name:"Elif", role:"worker", active:true, rate:150, createdAt:at(-40, 9)},
    {id:"udemoolga", name:"Ольга", role:"worker", active:true, rate:160, createdAt:at(-40, 9)}
  ];
  for (const st of staff) st.pinHash = await pinHash(st.id, st.role==="admin" ? DEMO.pinAdmin : DEMO.pinWorker);
  const workers = staff.filter(x => x.role!=="admin");

  // the program's own functions (recipe cards, packaging) compute what each order takes from stock
  Object.assign(S, {products, recipes, menu, sets, settings, staff});
  const moves = [], orders = [], sales = [], shifts = [], expenses = [], invdrafts = [];
  const stock = {}; const add = (pid, d) => { stock[pid] = r3((stock[pid] || 0) + d); };
  const isPrep = pid => recipes.some(r => r.id===pid);
  const price = pid => { const p = byId(pid); return r2((p.cost || 0) * (0.93 + rnd() * 0.14)); };
  const restock = (pid, need, ts) => {
    const p = byId(pid); if (!p || !(buyOf[pid] > 0)) { add(pid, 0); return; }
    let q = 0; while ((stock[pid] || 0) + q < need) q += buyOf[pid];
    if (!q) return; q = r3(q);
    moves.push({id:id("m"), productId:pid, unit:p.unit, type:"in", delta:q, price:price(pid), note:"", who:"Kemal", ts}); add(pid, q);
  };
  const ensure = (pid, need, ts, who) => {
    if ((stock[pid] || 0) >= need) return;
    if (pid==="p02"){ while ((stock.p02 || 0) < need) cutSalmon(ts); return; }
    if (!isPrep(pid)){ restock(pid, need, ts); return; }
    const r = recipes.find(x => x.id===pid), p = byId(pid);
    let q = 0; while ((stock[pid] || 0) + q < need) q += r.yield * 2;
    q = r3(q);
    const plan = cookPlan(pid, q), batchId = id("b"), t = ts + 60000;
    for (const it of plan) ensure(it.productId, it.qty, ts, who);
    moves.push({id:id("m"), productId:pid, unit:p.unit, type:"prod", delta:q, note:"По рецепту", who, ts:t, batchId}); add(pid, q);
    for (const it of plan){ moves.push({id:id("m"), productId:it.productId, unit:byId(it.productId).unit, type:"use", delta:-it.qty, note:`На: ${p.name}, ${fmt(q)} ${p.unit}`, who, ts:t, batchId}); add(it.productId, -it.qty); }
  };
  // opening stock 35 days ago
  const t0 = at(-35, 9, 30);
  for (const p of products) if (buyOf[p.id] > 0){ const q = buyOf[p.id] * 2; moves.push({id:id("m"), productId:p.id, unit:p.unit, type:"in", delta:q, price:p.cost, note:"Начальный остаток", who:"Kemal", ts:t0}); add(p.id, q); }
  // whole salmon cut into fillet + fish sets once a week
  const cutSalmon = ts => {
    if ((stock.p01 || 0) < 6) restock("p01", 6, ts - 3600000);
    const w = 6, fil = r3(w * 0.75 * (0.96 + rnd() * 0.04)), n = 2, note = `Разделка: лосось ${fmt(w)} кг`;
    moves.push({id:id("m"), productId:"p02", unit:"шт", type:"cut", delta:n, note, who:"Kemal", ts}); add("p02", n);
    moves.push({id:id("m"), productId:"p01", unit:"кг", type:"use", delta:-w, note, who:"Kemal", ts}); add("p01", -w);
    moves.push({id:id("m"), productId:"p_salmon_fillet", unit:"кг", type:"cut", delta:fil, note, who:"Kemal", ts}); add("p_salmon_fillet", fil);
  };

  const NAMES = ["Mehmet","Ahmet","Zeynep","Emre","Fatma","Burak","Selin","Can","Deniz","Ece","Иван","Анна","Murat","Merve","Kerem","Ольга К.","Hakan","Seda"];
  const STREETS = ["Örnek Sok.","Deneme Cad.","Lale Sok.","Gül Sok.","Çınar Cad.","Papatya Sok."];
  const phone = () => "0500 000 " + String(ri(10, 99)) + " " + String(ri(10, 99));
  const dishW = [["dphila",14],["dcali",10],["ddragon",6],["dspicy",6],["dtempura",7],["dveggie",3],["dmaki",5],["dsush1",5],["dsush2",3],["dsush3",3],["dtomyam",6],["dborsch",4],["dukha",3],["dpelmeni",5],["dteriyaki",5],["dcheesecake",3]];
  const drinkW = [["dcola",5],["dayran",3],["dwater",3],["dtea",3]];
  const lineOf = (kind, did, qty) => { const src = kind==="set" ? sets.find(x => x.id===did) : menu.find(x => x.id===did); return {kind, id:did, name:src.name, qty, price:src.price, comment:""}; };
  const makeLines = () => {
    const lines = [], n = wpick([[1,3],[2,4],[3,3],[4,1]]);
    if (rnd() < 0.12) lines.push(lineOf("set", "sclassic", 1));
    for (let i = 0; i < n; i++){ const did = wpick(dishW), ex = lines.find(l => l.id===did); if (ex) ex.qty++; else lines.push(lineOf("dish", did, rnd() < 0.25 ? 2 : 1)); }
    if (rnd() < 0.45){ const did = wpick(drinkW); lines.push(lineOf("dish", did, ri(1, 3))); }
    if (rnd() < 0.04){ const l = lines[lines.length - 1]; l.promo = true; l.basePrice = l.price; l.price = 0; l.promoBy = "Kemal"; }
    return lines;
  };
  const makeOrder = (ts, num, who) => {
    const type = wpick([["hall",45],["takeaway",25],["delivery",30]]);
    const source = type==="hall" ? "" : wpick([["Свои (телефон, на месте)",50],["Yemeksepeti",30],["Собственный: сайт",12],["Uber Eats",8]]);
    const o = {id:id("o"), num, type, table: type==="hall" ? String(ri(1, 8)) : "", name: type!=="hall" ? pick(NAMES) : "", phone: type!=="hall" ? phone() : "",
      address: type==="delivery" ? `${pick(STREETS)} No: ${ri(1, 60)}, daire ${ri(1, 12)}` : "", courier:"", due:"", source, lines:makeLines(), comment:"",
      createdAt:ts, updatedAt:ts, status:"new", who};
    if (type==="delivery"){ const d = new Date(ts + 45 * 60000); o.due = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
    if (type==="delivery" && source==="Свои (телефон, на месте)" && rnd() < 0.6) o.courierFee = 60;
    if (rnd() < 0.05){ o.discPct = 10; o.discBy = "Kemal"; }
    o.total = orderTotal(o);
    return o;
  };
  const closeOrder = (o, ts) => {
    const who = o.who, {ing} = orderIng(o);
    for (const [pid, q] of Object.entries(ing)) ensure(pid, q, at(Math.floor((ts - today) / DAY), 9, 0), who);
    const aggr = AGGREGATORS.includes(o.source);
    const payment = aggr ? "Агрегатор" : wpick([["Наличные",35],["Карта",55],["Перевод",10]]);
    const batchId = id("b"), total = orderTotal(o);
    const where = o.type==="hall" ? (o.table ? `, стол ${o.table}` : "") : (o.name ? `, ${o.name}` : "");
    const label = `Заказ №${o.num} (${OTYPES[o.type]}${where})`;
    for (const [pid, q] of Object.entries(ing)){ moves.push({id:id("m"), productId:pid, unit:byId(pid).unit, type:"sale", delta:-q, note:"Продажа", batchLabel:label, who, ts, batchId, orderId:o.id}); add(pid, -q); }
    sales.push(Object.assign({id:batchId, lines:o.lines.map(l => Object.assign({kind:l.kind, refId:l.id, name:l.name, qty:l.qty, price:Number(l.price) || 0}, l.promo ? {promo:true, basePrice:l.basePrice, promoBy:l.promoBy} : {})),
      who, ts, orderId:o.id, orderType:o.type, source:o.source || "", payment, total}, courFee(o) ? {courierFee:courFee(o)} : {}, orderPct(o) ? {discPct:orderPct(o), disc:orderDisc(o), subtotal:orderSubtotal(o), discBy:o.discBy || "", orderNum:o.num} : {}));
    Object.assign(o, {status:"closed", payment, total, closedAt:ts, saleBatchId:batchId, updatedAt:ts, cookingAt:o.createdAt + 3 * 60000, readyAt:ts - 8 * 60000, servedAt:ts - 5 * 60000});
    if (courFee(o)) expenses.push({id:"cour_" + o.id, cash:true, category:"Кассовые расходы", kind:"Курьер", note:"Заказ №" + o.num, amount:courFee(o), orderId:o.id, orderNum:o.num, fromOrder:true, who, whoId:"", ts:o.createdAt, createdAt:o.createdAt});
  };

  for (let day = -30; day <= 0; day++){
    const dow = new Date(at(day, 12)).getDay(), weekend = dow===0 || dow===5 || dow===6;
    // shifts: two of the three workers each day
    const onShift = workers.filter((w, i) => (day + 30 + i) % 3 !== 0);
    for (const w of onShift){
      const start = at(day, 10, ri(0, 15));
      if (day===0){ if (now > start) shifts.push({id:id("sh"), staffId:w.id, name:w.name, start, end:null}); continue; }
      shifts.push({id:id("sh"), staffId:w.id, name:w.name, start, end:at(day, 22, ri(0, 40))});
    }
    if (day % 7 === -2 || day===-30) cutSalmon(at(day, 9, 40));
    // morning purchases: whatever is running low is bought in the usual amount
    for (const p of products) if (buyOf[p.id] > 0 && p.id!=="p01" && (stock[p.id] || 0) < Math.max(p.min * 1.3, buyOf[p.id] * 0.35) && rnd() < 0.8) restock(p.id, (stock[p.id] || 0) + buyOf[p.id], at(day, 9, ri(20, 50)));
    // orders through the day
    const n = day===0 ? 0 : weekend ? ri(16, 24) : ri(9, 15);
    const times = Array.from({length:n}, () => at(day, 11, 0) + Math.floor(rnd() * 11.5 * 3600000)).sort((a, b) => a - b);
    times.forEach((ts, i) => {
      const who = (onShift[i % onShift.length] || staff[0]).name, o = makeOrder(ts, i + 1, who);
      orders.push(o);
      if (rnd() < 0.025){ Object.assign(o, {status:"cancelled", cancelReason:"Клиент передумал", cancelledBy:who, cancelledAt:ts + 6 * 60000, updatedAt:ts + 6 * 60000}); return; }
      closeOrder(o, ts + ri(25, 55) * 60000);
    });
    if (day < 0 && day % 6 === -1){ moves.push({id:id("m"), productId:"pavocado", unit:"кг", type:"off", delta:-0.3, note:"Потемнели, испортились", who:onShift[0].name, ts:at(day, 21, 30)}); add("pavocado", -0.3); }
    if (day < 0 && day % 4 === 0){ expenses.push({id:id("c"), cash:true, category:"Кассовые расходы", kind:"Обед", note:"Обед персонала", amount:ri(3, 6) * 100, who:onShift[0].name, whoId:onShift[0].id, ts:at(day, 15), createdAt:at(day, 15)}); }
    if (day < 0 && day % 9 === -3){ expenses.push({id:id("c"), cash:true, category:"Кассовые расходы", kind:"Покупка", note:"Лимоны и зелень на рынке", amount:ri(2, 5) * 100, who:onShift[0].name, whoId:onShift[0].id, ts:at(day, 12), createdAt:at(day, 12)}); }
  }
  // today: a few orders already closed, three still open
  const todayWho = (shifts.filter(x => !x.end).map(x => x.name)[0]) || "Ayşe";
  let num = 0;
  const morning = Math.min(now - 75 * 60000, at(0, 13));
  for (let k = 0, ts = Math.max(at(0, 11), now - 5 * 3600000); k < 4 && ts < morning; k++, ts += ri(30, 60) * 60000){
    const o = makeOrder(ts, ++num, todayWho); orders.push(o); closeOrder(o, ts + ri(25, 40) * 60000);
  }
  [[35,"ready"],[20,"cooking"],[6,"new"]].forEach(([mins, status]) => {
    const ts = now - mins * 60000, o = makeOrder(ts, ++num, todayWho);
    o.status = status; if (status!=="new") o.cookingAt = ts + 2 * 60000; if (status==="ready") o.readyAt = ts + 25 * 60000;
    orders.push(o);
  });
  if ((stock.p01 || 0) < 1) restock("p01", 5.5, at(-1, 9, 30));
  // a manual stock count correction 10 days ago and a recount waiting for the admin
  moves.push({id:id("m"), productId:"pcucumber", unit:"кг", type:"inv", delta:-0.4, note:`Факт: ${fmt(Math.max(0, (stock.pcucumber || 0) - 0.4))} (пересчитал: Elif)`, who:"Kemal", ts:at(-10, 22, 30)}); add("pcucumber", -0.4);
  invdrafts.push({id:id("id"), by:"Elif", byId:"udemoelif", ts:at(-1, 22, 15), status:"pending", items:{pavocado: Math.max(0, r3((stock.pavocado || 0) - 0.2)), pcucumber: r3(stock.pcucumber || 0), pnori: Math.max(0, Math.round((stock.pnori || 0) - 6))}});
  // finance: rent and utilities, a few other expenses
  const ym = k => ymShift(ymOf(now), k);
  expenses.push({id:"mon_" + ym(-2) + "_0", monthly:true, month:ym(-2), category:"Аренда", amount:45000, note:"", ts:ymStart(ym(-2)), who:"Kemal"});
  expenses.push({id:"mon_" + ym(-1) + "_1", monthly:true, month:ym(-1), category:"Коммунальные услуги", amount:7800, note:"электричество, вода, газ", ts:ymStart(ym(-1)), who:"Kemal"});
  expenses.push({id:id("e"), category:"Реклама", amount:3000, note:"Реклама в Instagram", who:"Kemal", ts:at(-12, 12), createdAt:at(-12, 12)});
  expenses.push({id:id("e"), category:"Хозтовары", amount:1250, note:"Моющие средства, перчатки", who:"Kemal", ts:at(-6, 12), createdAt:at(-6, 12)});
  expenses.push({id:id("e"), category:"Комиссия агрегаторов", amount:4200, note:"Yemeksepeti", who:"Kemal", ts:at(-3, 12), createdAt:at(-3, 12)});

  const col = list => Object.fromEntries(list.map(d => [d.id, d]));
  return {products:col(products), recipes:col(recipes), menu:col(menu), sets:col(sets), settings:col(settings), staff:col(staff),
    moves:col(moves), orders:col(orders), sales:col(sales), shifts:col(shifts), expenses:col(expenses), invdrafts:col(invdrafts)};
}
(async () => {
  let data = null;
  try { const raw = DEMO_LS.getItem(DEMO.dbKey); data = raw ? JSON.parse(raw) : null; } catch(e){ data = null; }
  if (!data || !data.staff || !Object.keys(data.staff).length){
    try { data = await demoSeed(); } catch(e){ console.error("demo seed", e); data = {}; }
  }
  DEMO_DB.cols = data; demoSave();
  S.db = makeDb(); startSubs();
})();
