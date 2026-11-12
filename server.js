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
let S = { status: 'idle', round: 1, qtext: DEFQ, questions: [], subs: [], winners: [], draw: null, showList: false, minutes: 10, endsAt: 0, stoppedAt: 0, noRepeat: false };
try { Object.assign(S, JSON.parse(fs.readFileSync(FILE, 'utf8'))); } catch (e) {}
const save = () => fs.writeFileSync(FILE, JSON.stringify(S));
const parseQ = t => t.split('\n').map(l => l.split('|').map(x => x.trim())).filter(a => a.length >= 4 && a[0])
  .map(a => ({ q: a[0], o: a.slice(1, -1), c: (+a[a.length - 1]) - 1 })).filter(q => q.c >= 0 && q.c < q.o.length);
if (!S.questions.length) S.questions = parseQ(S.qtext);
const sha = x => crypto.createHash('sha256').update(String(x)).digest();
const eq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const SESS = sha(KEY + '|sess').toString('hex');
let fails = [], lockUntil = 0;
const keyOk = k => { if (Date.now() < lockUntil) return false; const ok = eq(k, KEY);
  if (!ok) { fails = fails.filter(t => Date.now() - t < 600000); fails.push(Date.now()); if (fails.length >= 10) { lockUntil = Date.now() + 300000; fails = []; } } return ok; };
const cookie = (req, n) => ((req.headers.cookie || '').split(';').map(c => c.trim().split('=')).find(p => p[0] === n) || [])[1];
const SEC = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'" };
const cs = v => { v = String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
const norm = n => n.trim().replace(/\s+/g, ' ').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();
const tickS = () => { if (S.status === 'open' && S.endsAt && Date.now() >= S.endsAt) { S.status = 'stopped'; S.stoppedAt = S.endsAt; save(); } };
const qualified = () => S.subs.filter(s => s.score / s.total >= PASS);

const TITLE = 'مسابقة حفل تقاعد الأستاذ محمد صائغ';
const CSS = `*{box-sizing:border-box}body{font-family:Tahoma,Arial,sans-serif;margin:0;background:#0f172a;color:#f1f5f9;padding:16px;direction:rtl}
.card{background:#1e293b;border-radius:14px;padding:16px;margin:12px auto;max-width:640px}h1,h2{text-align:center}
input[type=text],textarea{width:100%;padding:12px;border-radius:10px;border:1px solid #475569;background:#0f172a;color:#fff;font-size:16px}
textarea{min-height:160px;font-family:inherit}label{display:block;padding:10px;margin:6px 0;background:#334155;border-radius:8px;cursor:pointer}
button{background:#2563eb;color:#fff;border:0;border-radius:10px;padding:12px 18px;font-size:16px;margin:4px;cursor:pointer}
button.r{background:#dc2626}button.g{background:#16a34a}button.o{background:#d97706}.er{color:#f87171;text-align:center}
.big{font-size:32px;text-align:center}.win{font-size:64px;text-align:center;color:#fbbf24;margin:30px;font-weight:bold}
.grid{display:flex;flex-wrap:wrap;gap:10px;justify-content:center}.chip{background:#334155;padding:10px 18px;border-radius:30px;font-size:22px}
#qr{display:flex;justify-content:center;margin:20px;background:#fff;padding:14px;border-radius:12px;width:fit-content;margin-inline:auto}
#ov{position:fixed;inset:0;background:#0f172a;display:none;z-index:9;overflow:auto;padding:16px}table{width:100%;border-collapse:collapse}td,th{padding:6px;border-bottom:1px solid #334155;text-align:right}.ok{color:#4ade80}`;
const QRJS = '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>';
const COMMON = String.raw`function $(i){return document.getElementById(i)}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}`;
const page = (body, js, qr) => `<!doctype html><html lang=ar dir=rtl><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${TITLE}</title><style>${CSS}</style>${qr ? QRJS : ''}<body>${body}<script>${COMMON}\n${js}</script></body></html>`;

const USER = page(`<div class=card id=s1><h1>🎉 ${TITLE}</h1><p>اكتب اسمك الثلاثي</p><input type=text id=nm placeholder="الاسم الثلاثي"><button onclick=go()>دخول</button><p id=er class=er></p></div>
<div class=card id=s2 hidden><p class=big id=msg></p></div><div id=s3 hidden></div>`, String.raw`
var nm,qs=[],round,loaded=false,t,endsAt=0,off=0;
function fmt(r){var m=Math.floor(r/60),x=r%60;return (m<10?'0':'')+m+':'+(x<10?'0':'')+x}
setInterval(function(){var e=$('tm');if(e&&endsAt){var r=Math.max(0,Math.ceil((endsAt-(Date.now()+off))/1000));e.textContent='⏱ الوقت المتبقي '+fmt(r);e.style.color=r<=60?'#ef4444':''}},500);
function show(i){['s1','s2','s3'].forEach(function(x){$(x).hidden=x!=i})}
function go(){var v=$('nm').value.trim().replace(/\s+/g,' ');if(v.split(' ').length<3){$('er').textContent='الرجاء كتابة الاسم الثلاثي كاملاً';return}nm=v;poll();clearInterval(t);t=setInterval(poll,2000)}
function poll(){fetch('/api/state',{cache:'no-store'}).then(function(r){return r.json()}).then(function(s){
  if(s.status=='open'){if(!loaded){loaded=true;clearInterval(t);load()}}
 else{show('s2');$('msg').textContent=s.status=='idle'?'⏳ المسابقة لم تبدأ بعد، ابقَ في هذه الصفحة':'⛔ انتهت المسابقة'}}).catch(function(){if(nm){show('s2');$('msg').textContent='📶 جارٍ الاتصال... تأكد من الإنترنت'}})}
document.addEventListener('visibilitychange',function(){if(nm&&!loaded)poll()});window.addEventListener('online',function(){if(nm&&!loaded)poll()});
function load(){fetch('/api/questions',{cache:'no-store'}).then(function(r){return r.json()}).then(function(d){
 if(d.error){loaded=false;t=setInterval(poll,2000);return}
 qs=d.qs;round=d.round;endsAt=d.endsAt;off=d.now-Date.now();var h='<div id=tm class=card style="text-align:center;font-size:24px;position:sticky;top:0;z-index:2"></div><h2>'+esc(nm)+'</h2>';
 qs.forEach(function(q,i){h+='<div class=card><b>'+(i+1)+'. '+esc(q.q)+'</b>';q.o.forEach(function(o,j){h+='<label><input type=radio name=q'+i+' value='+j+'> '+esc(o)+'</label>'});h+='</div>'});
 h+='<div class=card><button onclick=send()>إرسال الإجابات</button><p id=er2 class=er></p></div>';$('s3').innerHTML=h;show('s3')})}
function again(){nm='';loaded=false;clearInterval(t);$('nm').value='';$('er').textContent='';show('s1')}
function send(){var a=[];for(var i=0;i<qs.length;i++){var c=document.querySelector('input[name=q'+i+']:checked');if(!c){$('er2').textContent='أجب على جميع الأسئلة';return}a.push(+c.value)}
 fetch('/api/submit',{method:'POST',body:JSON.stringify({name:nm,answers:a})}).then(function(r){return r.json()}).then(function(d){
  if(d.ok){show('s2');$('msg').innerHTML='✅ تم استلام إجاباتك، شكراً لمشاركتك<br><br><button onclick="again()">➕ مشاركة جديدة باسم آخر</button>'}else if(d.error.indexOf('الاسم')>=0){nm='';loaded=false;clearInterval(t);show('s1');$('er').textContent=d.error}else $('er2').textContent=d.error})}
`);

const SCREEN = page('<div id=main></div>', String.raw`
var seen=0,busy=false,last='',ST=null,off=0;
function set(h){if(h==last)return;last=h;$('main').innerHTML=h;var q=$('qr');if(q&&!q.firstChild)new QRCode(q,{text:location.origin+'/',width:360,height:360})}
function wl(s){return s.winners.length?'<div class=card><b>الفائزون:</b> '+s.winners.map(esc).join(' • ')+'</div>':''}
function render(s){ST=s;if(busy)return;
 if(s.draw&&s.draw.id!=seen){seen=s.draw.id;if(Date.now()-s.draw.id<20000){spin(s.draw);return}}
 if(s.draw){set('<h1>🏆 الفائز</h1><div class=win>'+esc(s.draw.winner)+'</div>'+wl(s));return}
 if(s.showList){var h='<h1>المتأهلون (80% فأعلى) — '+s.qualified.length+'</h1><div class=grid>';s.qualified.forEach(function(n){h+='<div class=chip>'+esc(n)+'</div>'});set(h+'</div>');return}
 if(s.status=='stopped'){set('<h1>⛔ انتهت المسابقة</h1><p class=big>عدد المشاركين: '+s.total+'</p>');return}
 set('<h1>🎉 ${TITLE}</h1><h2>امسح الرمز للمشاركة</h2><div id=qr></div><div class=win id=tm style="font-size:80px;margin:10px"></div><p class=big>'+(s.status=='open'?'المسابقة جارية — المشاركون: '+s.total:'ستبدأ المسابقة قريباً')+'</p>')}
function spin(d){busy=true;last='';$('main').innerHTML='<h1>🎲 جارٍ السحب...</h1><div class=win id=sp></div>';var t0=Date.now(),p=d.pool;
 (function tick(){var e=Date.now()-t0;if(e>6000){busy=false;last='';render(ST);return}$('sp').textContent=p[Math.floor(Math.random()*p.length)];setTimeout(tick,60+e/25)})()}
function poll(){fetch('/api/state',{cache:'no-store'}).then(function(r){return r.json()})
.then(function(s){off=s.now-Date.now();render(s)}).catch(function(){})}
function fmt(r){var m=Math.floor(r/60),x=r%60;return (m<10?'0':'')+m+':'+(x<10?'0':'')+x}
setInterval(function(){var e=$('tm');if(!e||!ST)return;
 if(ST.status=='open'){var r=Math.max(0,Math.ceil((ST.endsAt-(Date.now()+off))/1000));e.textContent='⏱ '+fmt(r);e.style.color=r<=60?'#ef4444':''}
 else{e.textContent='⏱ مدة المسابقة: '+ST.minutes+' دقيقة';e.style.color=''}},250);
poll();setInterval(poll,1500);
`, true);

const LOGIN = page(`<div class=card><h1>🔐 دخول الأدمن</h1><input type=password id=k placeholder="كلمة السر" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--mu);font-size:16px" onkeydown="if(event.key=='Enter')go()"><button onclick=go()>دخول</button><p id=er class=er></p></div>`, String.raw`
function go(){fetch('/api/login',{method:'POST',body:JSON.stringify({key:$('k').value})}).then(function(r){return r.json()}).then(function(d){if(d.ok)location='/admin';else $('er').textContent=d.error})}`);
const ADMIN = page(`<div id=ov><div style="position:fixed;top:10px;right:10px;left:10px;display:flex;justify-content:space-between"><button onclick="drawNow()">🎲 سحب فائز آخر</button><button class=r onclick="closeOv()">✖ إغلاق</button></div><div id=ovc style="padding-top:70px"></div></div>
<h1>لوحة التحكم — ${TITLE}</h1><p id=wk class=er></p>
<div class=card><p>الحالة: <b id=st></b> | المشاركون: <b id=tot></b> | المتأهلون (80%+): <b id=qc></b></p>
المدة بالدقائق: <input type=text id=mins value=10 style="width:70px;display:inline-block"> <button class=g onclick="act('start',{minutes:+$('mins').value||10})">▶ بدء المسابقة</button><button class=r onclick="act('stop')">⏹ إيقاف المسابقة</button>
<button class=o onclick="act('list')">📋 عرض/إخفاء قائمة المتأهلين</button><button onclick="drawNow()">🎲 سحب فائز</button>
<button onclick="act('hide')">🖥 إخفاء الفائز</button><button class=o id=nr onclick="act('norepeat')"></button><button class=r onclick="resetAll()">♻ تصفير</button>
<p id=msg class=er></p><p>📺 <a style="color:#93c5fd" id=sl target=_blank>افتح شاشة العرض</a> | <a style="color:#93c5fd" id=ex>تصدير CSV</a></p></div>
<div class=card><b>🧪 اختبار النظام:</b> عدد المشاركين التجريبيين <input type=text id=cnt value=20 style="width:70px;display:inline-block"> <button class=o onclick="act('seed',{count:+$('cnt').value||20})">إضافة مشاركين تجريبيين</button><button class=r onclick="act('clearfake')">🧹 حذف التجريبيين</button></div>
<div class=card><b>رابط المشاركة:</b> <span id=lk></span><div id=qr></div></div>
<div class=card><b>الأسئلة</b> (سطر لكل سؤال: السؤال | خيار | خيار | خيار | رقم الإجابة الصحيحة)
<textarea id=qt></textarea><button onclick=saveQ()>💾 حفظ الأسئلة</button></div>
<div class=card><b>ما يظهر الآن على شاشة العرض:</b> <span id=sc></span><div id=ql style="margin-top:8px"></div></div>
<div class=card><b>النتائج</b><table id=tb></table></div>`, String.raw`
var K='',first=true;
$('lk').textContent=location.origin+'/';$('sl').href='/screen';$('ex').href='/api/admin/csv?key='+encodeURIComponent(K);
new QRCode($('qr'),{text:location.origin+'/',width:200,height:200});
function act(a,b){fetch('/api/admin/'+a+'?key='+encodeURIComponent(K),{method:'POST',body:JSON.stringify(b||{})}).then(function(r){return r.json()}).then(function(d){$('msg').textContent=d.error||'✔ تم';if(d.draw)spinAdmin(d.draw);poll()})}
var armed=false;
function resetAll(){if(!armed){armed=true;$('msg').textContent='⚠️ اضغط تصفير مرة ثانية خلال 5 ثواني للتأكيد';setTimeout(function(){armed=false},5000);return}armed=false;fetch('/api/admin/reset?key='+encodeURIComponent(K),{method:'POST',body:'{}'}).then(function(r){return r.json()}).then(function(d){$('msg').textContent=d.error||'✅ تم التصفير';poll()}).catch(function(){$('msg').textContent='تعذر الاتصال بالسيرفر'})}
function saveQ(){act('questions',{text:$('qt').value})}
function poll(){fetch('/api/admin/state?key='+encodeURIComponent(K)).then(function(r){return r.json()}).then(function(s){
 if(s.error){location='/admin';return}
 $('st').textContent={idle:'لم تبدأ',open:'جارية',stopped:'متوقفة'}[s.status];$('tot').textContent=s.subs.length;
 var q=s.subs.filter(function(x){return x.score/x.total>=0.8});$('qc').textContent=q.length;
 if(first){first=false;$('qt').value=s.qtext}
 var h='<tr><th>الاسم</th><th>الدرجة</th><th>النسبة</th></tr>';
 s.subs.slice().sort(function(a,b){return b.score-a.score}).forEach(function(x){var p=Math.round(100*x.score/x.total);h+='<tr><td>'+esc(x.name)+(x.fake?' 🧪':'')+(s.winners.indexOf(x.name)>=0?' 🏆':'')+'</td><td>'+x.score+'/'+x.total+'</td><td class='+(p>=80?'ok':'')+'>'+p+'%</td></tr>'});
 $('tb').innerHTML=h;$('wk').textContent=s.weak?'⚠️ كلمة سر الأدمن ضعيفة: غيّر ADMIN_KEY في Render إلى 10 أحرف أو أكثر':'';$('nr').textContent=s.noRepeat?'🔒 منع تكرار الفائز: مفعّل':'🔓 منع تكرار الفائز: معطّل';$('sc').textContent=s.draw?('🏆 الفائز: '+s.draw.winner):(s.showList?'📋 قائمة المتأهلين':'— لا شيء —');$('ql').innerHTML='<small>المتأهلون الآن ('+s.qual.length+'):</small> '+(s.qual.length?s.qual.map(esc).join(' • '):'لا أحد حتى الآن (يلزم 80% فأعلى)');ovUpdate(s)})}
var spinning=false,spinEnd=0,QL=[],ovLock=false;
function closeOv(){spinning=false;ovLock=false;$('ov').style.display='none';fetch('/api/admin/hide?key='+encodeURIComponent(K),{method:'POST',body:'{}'}).then(poll)}
function ovUpdate(s){QL=s.qual||[];if(spinning||ovLock||Date.now()-spinEnd<2500)return;var o=$('ov'),c=$('ovc');
 if(s.draw){c.innerHTML='<h1>🏆 الفائز</h1><div class=win>'+esc(s.draw.winner)+'</div>';o.style.display='block'}
 else if(s.showList){var h='<h1>المتأهلون (80% فأعلى) — '+s.qual.length+'</h1><div class=grid>';s.qual.forEach(function(n){h+='<div class=chip>'+esc(n)+'</div>'});c.innerHTML=h+'</div>';o.style.display='block'}
 else o.style.display='none'}
function drawNow(){if(spinning)return;spinning=true;ovLock=false;$('msg').textContent='';
 $('ov').style.display='block';$('ovc').innerHTML='<h1>🎲 جارٍ السحب...</h1><div class=win id=sp></div>';
 var t0=Date.now(),res=null,failed=false,fm='';
 (function tick(){if(!spinning)return;var e=Date.now()-t0,p=(res&&res.pool)||QL;
  if(failed){spinning=false;ovLock=true;$('ovc').innerHTML='<h1 class=er>'+esc(fm)+'</h1><div style="text-align:center"><button class=o onclick="act(\'resetwinners\');closeOv()">↺ أعد الفائزين السابقين للسحب</button></div>';return}
  if(res&&e>6000){spinning=false;spinEnd=Date.now();$('ovc').innerHTML='<h1>🏆 الفائز</h1><div class=win>'+esc(res.winner)+'</div>';poll();return}
  $('sp').textContent=p.length?p[Math.floor(Math.random()*p.length)]:'...';setTimeout(tick,60+Math.min(e,6000)/25)})();
 fetch('/api/admin/draw?key='+encodeURIComponent(K),{method:'POST',body:'{}'}).then(function(r){return r.json()}).then(function(d){if(d.error){failed=true;fm=d.error}else res=d.draw}).catch(function(){failed=true;fm='تعذر الاتصال'})}
function spinAdmin(d){spinning=true;$('ov').style.display='block';$('ovc').innerHTML='<h1>🎲 جارٍ السحب...</h1><div class=win id=sp></div>';var t0=Date.now(),p=d.pool;
 (function tick(){if(!spinning)return;var e=Date.now()-t0;
  if(e>6000){spinning=false;$('ovc').innerHTML='<h1>🏆 الفائز</h1><div class=win>'+esc(d.winner)+'</div>';poll();return}
  $('sp').textContent=p[Math.floor(Math.random()*p.length)];setTimeout(tick,60+e/25)})()}
poll();setInterval(poll,2500);
`, true);

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'), p = u.pathname; let b = '';
  req.on('data', c => { b += c; if (b.length > 1e5) req.destroy(); });
  req.on('end', () => {
    tickS();
    const J = (o, c = 200) => { res.writeHead(c, { 'Content-Type': 'application/json; charset=utf-8', ...SEC }); res.end(JSON.stringify(o)); };
    const H = h => { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', ...SEC }); res.end(h); };
    let d = {}; try { d = JSON.parse(b || '{}'); } catch (e) {}
    const qk = u.searchParams.get('key'), ck = cookie(req, 'adm');
    const adm = !!((ck && eq(ck, SESS)) || (qk && keyOk(qk)));
    const sess = () => 'adm=' + SESS + '; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200' + (req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '');
    if (p === '/') return H(USER);
    if (p === '/screen') return H(SCREEN);
    if (p === '/admin') {
      if (adm && qk) { res.writeHead(302, { Location: '/admin', 'Set-Cookie': sess(), ...SEC }); return res.end(); }
      return H(adm ? ADMIN : LOGIN);
    }
    if (p === '/api/login' && req.method === 'POST') {
      if (Date.now() < lockUntil) return J({ error: 'محاولات كثيرة، انتظر 5 دقائق' }, 429);
      if (typeof d.key === 'string' && keyOk(d.key)) { res.setHeader('Set-Cookie', sess()); return J({ ok: true }); }
      return J({ error: 'كلمة السر غير صحيحة' }, 403);
    }
    if (p === '/api/state') return J({ now: Date.now(), minutes: S.minutes, endsAt: S.endsAt, status: S.status, round: S.round, total: S.subs.length, draw: S.draw, winners: S.winners,
      showList: S.showList, qualified: S.showList ? qualified().map(s => s.name) : [] });
    if (p === '/api/questions') return S.status !== 'open' ? J({ error: 'closed' })
      : J({ now: Date.now(), endsAt: S.endsAt, round: S.round, qs: S.questions.map(q => ({ q: q.q, o: q.o })) });
    if (p === '/api/submit' && req.method === 'POST') {
      if (S.status !== 'open') return J({ error: 'المسابقة غير مفتوحة' });
      const name = String(d.name || '').trim().replace(/\s+/g, ' ');
      if (name.split(' ').length < 3) return J({ error: 'الرجاء كتابة الاسم الثلاثي' });
      if (name.length > 60) return J({ error: 'الاسم طويل جداً' });
      if (S.subs.length >= 3000) return J({ error: 'اكتمل العدد' });
      if (!Array.isArray(d.answers) || d.answers.length !== S.questions.length) return J({ error: 'إجابات غير مكتملة' });
      if (d.answers.some((x, i) => !Number.isInteger(x) || x < 0 || x >= S.questions[i].o.length)) return J({ error: 'إجابات غير صالحة' });
      if (S.subs.some(s => norm(s.name) === norm(name))) return J({ error: 'هذا الاسم شارك مسبقاً' });
      const score = S.questions.filter((q, i) => d.answers[i] === q.c).length;
      S.subs.push({ name, score, total: S.questions.length, at: Date.now() }); save();
      return J({ ok: true });
    }
    if (p.startsWith('/api/admin/')) {
      if (!adm) return J({ error: 'forbidden' }, 403);
      const a = p.slice(11);
      if (a === 'state') return J({ status: S.status, qtext: S.qtext, subs: S.subs, winners: S.winners, qual: qualified().map(s => s.name), draw: S.draw, showList: S.showList, noRepeat: S.noRepeat, weak: KEY.length < 10 });
      if (a === 'csv') { res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=results.csv', ...SEC });
        return res.end('\ufeffالاسم,الدرجة,من,النسبة\n' + S.subs.map(s => [s.name, s.score, s.total, Math.round(100 * s.score / s.total) + '%'].map(cs).join(',')).join('\n')); }
      if (a === 'start') { if (!S.questions.length) return J({ error: 'لا توجد أسئلة' }); S.minutes = Math.min(180, Math.max(1, +d.minutes || 10)); S.endsAt = Date.now() + S.minutes * 60000; S.status = 'open'; S.draw = null; S.showList = false; }
      else if (a === 'stop') S.status = 'stopped';
      else if (a === 'list') S.showList = !S.showList, S.draw = null;
      else if (a === 'hide') S.draw = null, S.showList = false;
      else if (a === 'seed') {
        const R = n => Math.floor(Math.random() * n), P = arr => arr[R(arr.length)], T = S.questions.length, th = Math.ceil(T * PASS);
        const F = ['محمد','أحمد','خالد','عبدالله','سعد','فهد','سلطان','نواف','ماجد','يوسف','تركي','بندر','ناصر','عمر','فيصل','راشد'], L = ['العتيبي','الغامدي','القحطاني','الدوسري','الشمري','الحربي','الزهراني','المطيري','السبيعي','العنزي','الشهري','البلوي'];
        const n = Math.min(100, Math.max(1, +d.count || 20));
        for (let i = 0; i < n; i++) {
          const name = P(F) + ' ' + P(F) + ' ' + P(L);
          if (S.subs.some(x => norm(x.name) === norm(name))) continue;
          const score = Math.random() < 0.4 ? th + R(T - th + 1) : R(th);
          S.subs.push({ name, score, total: T, at: Date.now(), fake: true });
        }
      }
      else if (a === 'clearfake') { S.subs = S.subs.filter(x => !x.fake); S.winners = []; S.draw = null; S.showList = false; }
      else if (a === 'norepeat') S.noRepeat = !S.noRepeat;
      else if (a === 'resetwinners') S.winners = [], S.draw = null;
      else if (a === 'reset') Object.assign(S, { round: Date.now(), subs: [], winners: [], draw: null, showList: false, status: 'idle', endsAt: 0 });
      else if (a === 'questions') {
        if (S.status === 'open') return J({ error: 'أوقف المسابقة أولاً قبل تعديل الأسئلة' });
        const qs = parseQ(String(d.text || '')); if (!qs.length) return J({ error: 'صيغة الأسئلة غير صحيحة' });
        S.qtext = d.text; S.questions = qs;
      } else if (a === 'draw') {
        const pool = qualified().map(s => s.name).filter(n => !S.noRepeat || !S.winners.includes(n));
        if (!pool.length) return J({ error: 'لا يوجد متأهلون متبقون للسحب' });
        const winner = pool[crypto.randomInt(pool.length)];
        if (!S.winners.includes(winner)) S.winners.push(winner); S.showList = false; S.draw = { id: Date.now(), winner, pool };
      }
      save(); return J({ ok: true, draw: a === 'draw' ? S.draw : null });
    }
    res.writeHead(404); res.end('not found');
  });
}).listen(PORT, () => console.log('Running on http://localhost:' + PORT + '  | admin: /admin'));
