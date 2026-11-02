// منصة مسابقات مباشرة — بدون أي مكتبات. تشغيل: ADMIN_KEY=كلمة_سر node server.js
const http = require('http'), fs = require('fs'), crypto = require('crypto');
const PORT = process.env.PORT || 3000, KEY = process.env.ADMIN_KEY || 'admin123', FILE = 'data.json', PASS = 0.8;
const DEFQ = `ما العنصر الكيميائي الذي رمزه Au؟ | الفضة | النحاس | الذهب | الحديد | 3
في أي عام تأسست المملكة العربية السعودية بمسماها الحالي؟ | 1927 | 1902 | 1953 | 1932 | 4
ما عاصمة أستراليا؟ | سيدني | كانبرا | ملبورن | بيرث | 2
كم عدد عظام جسم الإنسان البالغ؟ | 186 | 226 | 206 | 256 | 3
من مؤلف رواية "البؤساء"؟ | تولستوي | ديكنز | بلزاك | فيكتور هوغو | 4
في أي دولة يقع جبل كليمنجارو؟ | كينيا | تنزانيا | أوغندا | إثيوبيا | 2
ما أصغر دولة في العالم من حيث المساحة؟ | موناكو | سان مارينو | الفاتيكان | ليختنشتاين | 3
ما الغاز الأكثر وفرة في الغلاف الجوي للأرض؟ | النيتروجين | الأكسجين | ثاني أكسيد الكربون | الأرغون | 1
من اللاعب الوحيد الذي فاز بكأس العالم لكرة القدم ثلاث مرات؟ | مارادونا | ميسي | زيدان | بيليه | 4
ما العدد الذري لعنصر الرصاص؟ | 80 | 82 | 78 | 84 | 2`;
let S = { status: 'idle', round: 1, qtext: DEFQ, questions: [], subs: [], winners: [], draw: null, showList: false };
try { Object.assign(S, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) {}
const save = () => fs.writeFileSync(FILE, JSON.stringify(S));
const parseQ = t => t.split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a.length >= 4 && a[0])
  .map(a => ({ q: a[0], o: a.slice(1, -1), c: (+a[a.length - 1]) - 1 })).filter(q => q.c >= 0 && q.c < q.o.length);
if (!S.questions.length) S.questions = parseQ(S.qtext);
const norm = n => n.trim().replace(/\s+/g, ' ').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
const qualified = () => S.subs.filter(s => s.score / s.total >= PASS);

const CSS = `*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#0f172a;color:#f1f5f9;padding:16px;direction:rtl}
.card{background:#1e293b;border-radius:14px;padding:16px;margin:12px auto;max-width:640px}h1,h2{text-align:center}
input[type=text],textarea{width:100%;padding:12px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#fff;font-size:16px}
textarea{min-height:160px;font-family:inherit}label{display:block;padding:10px;margin:6px 0;background:#334155;border-radius:8px;cursor:pointer}
button{background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-size:16px;margin:4px;cursor:pointer}
button.r{background:#dc2626}button.g{background:#16a34a}button.o{background:#d97706}.er{color:#f87171;text-align:center}
.big{font-size:32px;text-align:center}.win{font-size:64px;text-align:center;color:#fbbf24;margin:30px;font-weight:bold}
.grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.chip{background:#334155;padding:10px 18px;border-radius:30px;font-size:22px}
#qr{display:flex;justify-content:center;margin:20px;background:#fff;padding:14px;border-radius:12px;width:fit-content;margin-inline:auto}
table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #334155;text-align:right}.ok{color:#4ade80}`;
const QRJS = '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>';
const COMMON = String.raw`function $(i){return document.getElementById(i)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}`;
const page = (body, js, qr) => `<!doctype html><html lang=ar dir=rtl><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>المسابقة</title><style>${CSS}</style>${qr ? QRJS : ''}<body>${body}<script>${COMMON}\n${js}</script></body></html>`;

const USER = page(`<div class=card id=s1><h1>🎯 المسابقة</h1><p>اكتب اسمك الثلاثي</p><input type=text id=nm placeholder="الاسم الثلاثي"><button onclick=go()>دخول</button><p id=er class=er></p></div>
<div class=card id=s2 hidden><p class=big id=msg></p></div><div id=s3 hidden></div>`, String.raw`
var nm,qs=[],round,loaded=false,t;
function show(i){['s1','s2','s3'].forEach(function(x){$(x).hidden=x!=i})}
function go(){var v=$('nm').value.trim().replace(/\s+/g,' ');if(v.split(' ').length<3){$('er').textContent='الرجاء كتابة الاسم الثلاثي كاملاً';return}nm=v;poll();t=setInterval(poll,2000)}
function poll(){fetch('/api/state').then(function(r){return r.json()}).then(function(s){
 if(localStorage.getItem('done')==String(s.round)){show('s2');$('msg').textContent='✅ تم استلام إجاباتك، شكراً لمشاركتك';clearInterval(t);return}
 if(s.status=='open'){if(!loaded){loaded=true;clearInterval(t);load()}}
 else{show('s2');$('msg').textContent=s.status=='idle'?'⏳ المسابقة لم تبدأ بعد، ابقَ في هذه الصفحة':'⛔ انتهت المسابقة'}}).catch(function(){})}
function load(){fetch('/api/questions').then(function(r){return r.json()}).then(function(d){
 if(d.error){loaded=false;t=setInterval(poll,2000);return}
 qs=d.qs;round=d.round;var h='<h2>'+esc(nm)+'</h2>';
 qs.forEach(function(q,i){h+='<div class=card><b>'+(i+1)+'. '+esc(q.q)+'</b>';q.o.forEach(function(o,j){h+='<label><input type=radio name=q'+i+' value='+j+'> '+esc(o)+'</label>'});h+='</div>'});
 h+='<div class=card><button onclick=send()>إرسال الإجابات</button><p id=er2 class=er></p></div>';$('s3').innerHTML=h;show('s3')})}
function send(){var a=[];for(var i=0;i<qs.length;i++){var c=document.querySelector('input[name=q'+i+']:checked');if(!c){$('er2').textContent='أجب على جميع الأسئلة';return}a.push(+c.value)}
 fetch('/api/submit',{method:'POST',body:JSON.stringify({name:nm,answers:a})}).then(function(r){return r.json()}).then(function(d){
  if(d.ok){localStorage.setItem('done',String(round));show('s2');$('msg').textContent='✅ تم استلام إجاباتك، شكراً لمشاركتك'}else $('er2').textContent=d.error})}
`);

const SCREEN = page('<div id=main></div>', String.raw`
var seen=0,busy=false,last='',ST=null;
function set(h){if(h==last)return;last=h;$('main').innerHTML=h;var q=$('qr');if(q&&!q.firstChild)new QRCode(q,{text:location.origin+'/',width:360,height:360})}
function wl(s){return s.winners.length?'<div class=card><b>الفائزون:</b> '+s.winners.map(esc).join(' • ')+'</div>':''}
function render(s){ST=s;if(busy)return;
 if(s.draw&&s.draw.id!=seen){seen=s.draw.id;if(Date.now()-s.draw.id<20000){spin(s.draw);return}}
 if(s.draw){set('<h1>🏆 الفائز</h1><div class=win>'+esc(s.draw.winner)+'</div>'+wl(s));return}
 if(s.showList){var h='<h1>المتأهلون (80% فأعلى) — '+s.qualified.length+'</h1><div class=grid>';s.qualified.forEach(function(n){h+='<div class=chip>'+esc(n)+'</div>'});set(h+'</div>');return}
 if(s.status=='stopped'){set('<h1>⛔ انتهت المسابقة</h1><p class=big>عدد المشاركين: '+s.total+'</p>');return}
 set('<h1>🎯 امسح الرمز للمشاركة</h1><div id=qr></div><p class=big>'+(s.status=='open'?'المسابقة جارية — المشاركون: '+s.total:'ستبدأ المسابقة قريباً')+'</p>')}
function spin(d){busy=true;last='';$('main').innerHTML='<h1>🎲 جارٍ السحب...</h1><div class=win id=sp></div>';var t0=Date.now(),p=d.pool;
 (function tick(){var e=Date.now()-t0;if(e>6000){busy=false;last='';render(ST);return}$('sp').textContent=p[Math.floor(Math.random()*p.length)];setTimeout(tick,60+e/25)})()}
function poll(){fetch('/api/state').then(function(r){return r.json()}).then(render).catch(function(){})}
poll();setInterval(poll,1500);
`, true);

const ADMIN = page(`<h1>لوحة التحكم</h1>
<div class=card><p>الحالة: <b id=st></b> | المشاركون: <b id=tot></b> | المتأهلون (80%+): <b id=qc></b></p>
<button class=g onclick="act('start')">▶ بدء المسابقة</button><button class=r onclick="act('stop')">⏹ إيقاف المسابقة</button>
<button class=o onclick="act('list')">📋 عرض/إخفاء قائمة المتأهلين</button><button onclick="act('draw')">🎲 سحب فائز</button>
<button onclick="act('hide')">🖥 إخفاء الفائز</button><button class=r onclick="if(confirm('تصفير كل النتائج؟'))act('reset')">♻ تصفير</button>
<p id=msg class=er></p><p>📺 <a style="color:#93c5fd" id=sl target=_blank>افتح شاشة العرض</a> | <a style="color:#93c5fd" id=ex>تصدير CSV</a></p></div>
<div class=card><b>رابط المشاركة:</b> <span id=lk></span><div id=qr></div></div>
<div class=card><b>الأسئلة</b> (سطر لكل سؤال: السؤال | خيار | خيار | خيار | رقم الإجابة الصحيحة)
<textarea id=qt></textarea><button onclick=saveQ()>💾 حفظ الأسئلة</button></div>
<div class=card><b>النتائج</b><table id=tb></table></div>`, String.raw`
var K=new URLSearchParams(location.search).get('key')||'',first=true;
$('lk').textContent=location.origin+'/';$('sl').href='/screen';$('ex').href='/api/admin/csv?key='+encodeURIComponent(K);
new QRCode($('qr'),{text:location.origin+'/',width:200,height:200});
function act(a,b){fetch('/api/admin/'+a+'?key='+encodeURIComponent(K),{method:'POST',body:JSON.stringify(b||{})}).then(function(r){return r.json()}).then(function(d){$('msg').textContent=d.error||'';poll()})}
function saveQ(){act('questions',{text:$('qt').value})}
function poll(){fetch('/api/admin/state?key='+encodeURIComponent(K)).then(function(r){return r.json()}).then(function(s){
 if(s.error){document.body.innerHTML='<h1>مفتاح الإدارة غير صحيح</h1>';return}
 $('st').textContent={idle:'لم تبدأ',open:'جارية',stopped:'متوقفة'}[s.status];$('tot').textContent=s.subs.length;
 var q=s.subs.filter(function(x){return x.score/x.total>=0.8});$('qc').textContent=q.length;
 if(first){first=false;$('qt').value=s.qtext}
 var h='<tr><th>الاسم</th><th>الدرجة</th><th>النسبة</th></tr>';
 s.subs.slice().sort(function(a,b){return b.score-a.score}).forEach(function(x){var p=Math.round(100*x.score/x.total);h+='<tr><td>'+esc(x.name)+(s.winners.indexOf(x.name)>=0?' 🏆':'')+'</td><td>'+x.score+'/'+x.total+'</td><td class='+(p>=80?'ok':'')+'>'+p+'%</td></tr>'});
 $('tb').innerHTML=h})}
poll();setInterval(poll,2500);
`, true);

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname; let b = '';
  req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
  req.on('end', () => {
    const J = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(o)); };
    const H = h => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(h); };
    let d = {}; try { d = JSON.parse(b || '{}'); } catch (e) {}
    const adm = u.searchParams.get('key') === KEY;
    if (p === '/') return H(USER);
    if (p === '/screen') return H(SCREEN);
    if (p === '/admin') return H(ADMIN);
    if (p === '/api/state') return J({ status: S.status, round: S.round, total: S.subs.length, draw: S.draw, winners: S.winners,
      showList: S.showList, qualified: S.showList ? qualified().map(s => s.name) : [] });
    if (p === '/api/questions') return S.status !== 'open' ? J({ error: 'closed' })
      : J({ round: S.round, qs: S.questions.map(q => ({ q: q.q, o: q.o })) });
    if (p === '/api/submit' && req.method === 'POST') {
      if (S.status !== 'open') return J({ error: 'المسابقة غير مفتوحة' });
      const name = String(d.name || '').trim().replace(/\s+/g, ' ');
      if (name.split(' ').length < 3) return J({ error: 'الرجاء كتابة الاسم الثلاثي' });
      if (!Array.isArray(d.answers) || d.answers.length !== S.questions.length) return J({ error: 'إجابات غير مكتملة' });
      if (S.subs.some(s => norm(s.name) === norm(name))) return J({ error: 'هذا الاسم شارك مسبقاً' });
      const score = S.questions.filter((q, i) => d.answers[i] === q.c).length;
      S.subs.push({ name, score, total: S.questions.length, at: Date.now() }); save();
      return J({ ok: true });
    }
    if (p.startsWith('/api/admin/')) {
      if (!adm) return J({ error: 'forbidden' }, 403);
      const a = p.slice(11);
      if (a === 'state') return J({ status: S.status, qtext: S.qtext, subs: S.subs, winners: S.winners });
      if (a === 'csv') { res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=results.csv' });
        return res.end('\ufeffالاسم,الدرجة,من,النسبة\n' + S.subs.map(s => [s.name, s.score, s.total, Math.round(100 * s.score / s.total) + '%'].join(',')).join('\n')); }
      if (a === 'start') { if (!S.questions.length) return J({ error: 'لا توجد أسئلة' }); S.status = 'open'; S.draw = null; S.showList = false; }
      else if (a === 'stop') S.status = 'stopped';
      else if (a === 'list') S.showList = !S.showList, S.draw = null;
      else if (a === 'hide') S.draw = null;
      else if (a === 'reset') Object.assign(S, { round: Date.now(), subs: [], winners: [], draw: null, showList: false, status: 'idle' });
      else if (a === 'questions') {
        if (S.status === 'open') return J({ error: 'أوقف المسابقة أولاً قبل تعديل الأسئلة' });
        const qs = parseQ(String(d.text || '')); if (!qs.length) return J({ error: 'صيغة الأسئلة غير صحيحة' });
        S.qtext = d.text; S.questions = qs;
      } else if (a === 'draw') {
        const pool = qualified().map(s => s.name).filter(n => !S.winners.includes(n));
        if (!pool.length) return J({ error: 'لا يوجد متأهلون متبقون للسحب' });
        const winner = pool[crypto.randomInt(pool.length)];
        S.winners.push(winner); S.showList = false; S.draw = { id: Date.now(), winner, pool };
      }
      save(); return J({ ok: true });
    }
    res.writeHead(404); res.end('not found');
  });
}).listen(PORT, () => console.log('Running on http://localhost:' + PORT + '  | admin: /admin?key=' + KEY));
