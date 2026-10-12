'use strict';
const $=id=>document.getElementById(id), KEY='agenda-marzia-v1';
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const from=s=>new Date(s+'T12:00:00');
const monday=d=>{d=new Date(d);d.setHours(12,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return d};
const plus=(d,n)=>{d=new Date(d);d.setDate(d.getDate()+n);return d};
const mins=t=>Number(t.slice(0,2))*60+Number(t.slice(3));
const end=e=>{let n=mins(e.time)+e.duration;return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`};
const fmt=(d,o)=>d.toLocaleDateString('it-IT',o);
let events=[],week=monday(new Date()),selected=iso(new Date()),editing=null,original='',strokes=[],drawing=null,deleted=null,baseline='',readError=false,editConflict=false;
function notify(message,undo=false){$('toastText').textContent=message;$('toast').hidden=false;$('undoDelete').hidden=!undo}
function valid(e){return e&&typeof e.id==='string'&&e.id.length<150&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)&&!isNaN(from(e.date))&&iso(from(e.date))===e.date&&/^\d{2}:\d{2}$/.test(e.time)&&Number(e.time.slice(3))<60&&mins(e.time)>=540&&mins(e.time)<=1140&&Number.isInteger(e.duration)&&e.duration>=15&&e.duration<=615&&e.duration%15===0&&mins(e.time)+e.duration<=1155&&['work','personal'].includes(e.kind)&&typeof e.title==='string'&&e.title.length<=500&&typeof e.notes==='string'&&e.notes.length<=2000&&Array.isArray(e.strokes)&&e.strokes.length<=3000&&e.strokes.every(s=>Array.isArray(s)&&s.length<=20000&&s.every(p=>Array.isArray(p)&&p.length===2&&p.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=900)))}
function read(){try{const raw=localStorage.getItem(KEY);let data=raw?JSON.parse(raw):[];if(!Array.isArray(data)||!data.every(valid))throw Error();events=data;baseline=raw;readError=false}catch{readError=true;notify('Impossibile leggere i dati. Esporta un backup prima di intervenire.')}}
function persist(next){if(readError){notify('Salvataggio bloccato: i dati del browser non sono leggibili.');return false}try{if(localStorage.getItem(KEY)!==baseline){editConflict=$('editor').open;read();render();notify('Agenda aggiornata in un’altra finestra. Riapri l’appuntamento prima di salvarlo.');return false}let raw=JSON.stringify(next);localStorage.setItem(KEY,raw);baseline=raw;events=next;return true}catch{notify('Salvataggio non riuscito: spazio esaurito o memoria non disponibile. Esporta un backup.');return false}}
function el(tag,cls,text){let n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function drawOn(canvas,lines){const ctx=canvas.getContext('2d'),sx=canvas.width/900,sy=canvas.height/450;ctx.clearRect(0,0,canvas.width,canvas.height);ctx.strokeStyle='#294c40';ctx.fillStyle='#294c40';ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';for(const points of lines){if(!points.length)continue;ctx.beginPath();ctx.moveTo(points[0][0]*sx,points[0][1]*sy);for(const p of points.slice(1))ctx.lineTo(p[0]*sx,p[1]*sy);ctx.stroke();if(points.length===1){ctx.beginPath();ctx.arc(points[0][0]*sx,points[0][1]*sy,1.5,0,Math.PI*2);ctx.fill()}}}
function inkImage(lines){let c=document.createElement('canvas');c.width=450;c.height=225;drawOn(c,lines);let img=new Image();img.src=c.toDataURL();img.alt='Appunto scritto a mano';return img}
// Give simultaneous appointments separate lanes within each overlapping group.
function layoutEvents(items){
 const sorted=[...items].sort((a,b)=>mins(a.time)-mins(b.time)||b.duration-a.duration||a.id.localeCompare(b.id));
 const result=[];let group=[],ends=[],groupEnd=-1;
 function flush(){for(const item of group){item.lanes=ends.length;result.push(item)}group=[];ends=[]}
 for(const event of sorted){
  const start=mins(event.time),finish=start+event.duration;
  if(start>=groupEnd){flush();groupEnd=-1}
  let lane=ends.findIndex(t=>t<=start);if(lane<0)lane=ends.length;
  ends[lane]=finish;groupEnd=Math.max(groupEnd,finish);group.push({event,lane});
 }
 flush();return result;
}
function render(){syncBlockTools();renderWeekCounter();let days=Array.from({length:7},(_,i)=>plus(week,i));$('range').textContent=`${fmt(days[0],{day:'numeric',month:'short'})} – ${fmt(days[6],{day:'numeric',month:'short'})}`;$('month').textContent=`Settimana · ${fmt(days[6],{year:'numeric'})}`;const grid=$('calendar');grid.replaceChildren(el('div','corner'));
for(let d of days){let s=iso(d),b=el('button','dayhead'+(s===iso(new Date())?' today':'')+(s===selected?' selected':''));b.append(el('span','',fmt(d,{weekday:'short'})),el('b','',String(d.getDate())));b.setAttribute('aria-label',fmt(d,{weekday:'long',day:'numeric',month:'long'}));b.setAttribute('aria-pressed',String(s===selected));b.disabled=!!blockDraft;b.onclick=()=>{selected=s;render()};grid.append(b)}
for(let h=9;h<=19;h++){
 const row=h-7, hour=el('div','hour',`${String(h).padStart(2,'0')}:00`);
 hour.style.gridRow=String(row);hour.style.gridColumn='1';grid.append(hour);
 days.forEach((d,i)=>{const date=iso(d),cell=el('div','slot'+(date===selected?' selected':''));
 cell.style.gridRow=String(row);cell.style.gridColumn=String(i+2);
 const b=el('button','empty','＋');b.setAttribute('aria-label',`Aggiungi ${fmt(d,{weekday:'long',day:'numeric',month:'long'})}, ore ${h}`);
 b.onclick=()=>{selected=date;render();openEditor(null,date,`${String(h).padStart(2,'0')}:00`)};cell.append(b);grid.append(cell);
 });
}
days.forEach((d,i)=>{
 const layer=el('div','day-events');layer.style.gridColumn=String(i+2);layer.style.gridRow='2 / 13';
 for(const item of layoutEvents(events.filter(e=>e.date===iso(d)))){
  const e=item.event,b=el('button','event '+e.kind),range=`${e.time}–${end(e)}`;
  b.style.top=`${(mins(e.time)-540)/615*100}%`;b.style.height=`${e.duration/615*100}%`;
  b.style.left=`${item.lane/item.lanes*100}%`;b.style.width=`${100/item.lanes}%`;
  b.append(el('small','event-time',range));if(e.title)b.append(el('strong','',e.title));if(e.strokes.length){b.classList.add('with-ink');b.append(inkImage(e.strokes))}else if(!e.title)b.append(el('strong','','✎ Appunto'));
  b.title=`${range} · ${e.title||'Appunto a mano'}`;
  b.setAttribute('aria-label',`Dalle ${e.time} alle ${end(e)}, ${e.title||'Appunto a mano'}, ${e.kind==='work'?'lavoro':'personale'}`);
  b.onclick=()=>openEditor(e);layer.append(b);
 }
 grid.append(layer);wireBlockLayer(layer,iso(d));
});
$('daytitle').textContent=fmt(from(selected),{weekday:'long',day:'numeric',month:'long'});let list=$('daylist');list.replaceChildren();let daily=events.filter(e=>e.date===selected).sort((a,b)=>a.time.localeCompare(b.time));if(!daily.length)list.append(el('p','emptyday','Nessun appuntamento. Lascia spazio alle tue idee.'));for(let e of daily){let b=el('button','listitem '+e.kind),body=el('div','content');body.append(el('small','',e.kind==='work'?'LAVORO':'PERSONALE'),el('strong','',e.title||'Appunto a mano'));if(e.notes)body.append(el('small','',e.notes));if(e.strokes.length)body.append(inkImage(e.strokes));b.append(el('span','time',`${e.time}\n${end(e)}`),body,el('span','','›'));b.onclick=()=>openEditor(e);list.append(b)}}
function snapshot(){return JSON.stringify({date:$('date').value,time:$('time').value,duration:$('duration').value,kind:document.querySelector('[name=kind]:checked').value,title:$('title').value,notes:$('notes').value,strokes})}
function openEditor(e,date=selected,time='09:00'){if(blockDraft){notify('Salva o annulla prima il riquadro che stai scrivendo.');return}editConflict=false;editing=e?.id||null;selected=e?.date||date;$('editTitle').textContent=e?'Il tuo appuntamento':'Nuovo appuntamento';$('date').value=e?.date||date;$('time').value=e?.time||time;$('duration').value=String(e?.duration||(time==='19:00'?15:60));document.querySelector(`[name=kind][value=${e?.kind||'work'}]`).checked=true;$('title').value=e?.title||'';$('notes').value=e?.notes||'';strokes=JSON.parse(JSON.stringify(e?.strokes||[]));drawing=null;$('inkarea').hidden=!strokes.length;$('undoInk').hidden=!strokes.length;$('delete').hidden=!e;$('deleteConfirm').hidden=true;$('formerror').textContent='';original=snapshot();$('editor').showModal();drawOn($('ink'),strokes)}
function closeEditor(){if(snapshot()!==original&&!confirm('Chiudere senza salvare le modifiche a questo appuntamento?'))return;$('editor').close()}
$('form').onsubmit=e=>{e.preventDefault();if(editConflict){$('formerror').textContent='Chiudi e riapri questo appuntamento: i dati sono cambiati in un’altra finestra.';return}let a={id:editing||crypto.randomUUID(),date:$('date').value,time:$('time').value,duration:Number($('duration').value),kind:document.querySelector('[name=kind]:checked').value,title:$('title').value.trim(),notes:$('notes').value.trim(),strokes};if(!a.title&&!a.strokes.length){$('formerror').textContent='Scrivi un appuntamento oppure un appunto a mano.';return}if(!valid(a)){$('formerror').textContent='Controlla data e orari. L’ultimo appuntamento può iniziare alle 19:00 e finire entro le 19:15.';return}if(events.some(x=>x.id!==a.id&&x.date===a.date&&mins(x.time)<mins(a.time)+a.duration&&mins(a.time)<mins(x.time)+x.duration)&&!confirm('Questo orario si sovrappone a un altro appuntamento. Salvare comunque entrambi?'))return;if(persist([...events.filter(x=>x.id!==a.id),a])){$('editor').close();selected=a.date;week=monday(from(a.date));render();notify('Appuntamento salvato.')}};
$('editor').addEventListener('cancel',e=>{e.preventDefault();closeEditor()});$('close').onclick=$('cancel').onclick=closeEditor;
$('delete').onclick=()=>{$('deleteConfirm').hidden=false};$('keep').onclick=()=>{$('deleteConfirm').hidden=true};$('confirmDelete').onclick=()=>{if(editConflict){$('formerror').textContent='Chiudi e riapri l’appuntamento prima di eliminarlo.';return}let item=events.find(x=>x.id===editing);if(persist(events.filter(x=>x.id!==editing))){deleted=item;$('editor').close();render();notify('Appuntamento eliminato.',true)}};
$('undoDelete').onclick=()=>{if(deleted&&persist([...events.filter(x=>x.id!==deleted.id),deleted])){deleted=null;render();notify('Appuntamento ripristinato.')}};$('dismissToast').onclick=()=>{$('toast').hidden=true};
$('toggleInk').onclick=()=>{$('inkarea').hidden=!$('inkarea').hidden;$('undoInk').hidden=$('inkarea').hidden;drawOn($('ink'),strokes)};$('undoInk').onclick=()=>{strokes.pop();drawOn($('ink'),strokes)};
let pointer=null;const point=e=>{let r=$('ink').getBoundingClientRect();return [Math.max(0,Math.min(900,(e.clientX-r.left)*900/r.width)),Math.max(0,Math.min(450,(e.clientY-r.top)*450/r.height))]};
$('ink').onpointerdown=e=>{if(pointer!==null||e.button!==0)return;e.preventDefault();pointer=e.pointerId;$('ink').setPointerCapture(pointer);drawing=[point(e)];strokes.push(drawing);drawOn($('ink'),strokes)};
$('ink').onpointermove=e=>{if(pointer!==e.pointerId||!drawing)return;e.preventDefault();drawing.push(point(e));drawOn($('ink'),strokes)};
function finishInk(e){if(pointer===e.pointerId){pointer=null;drawing=null}}$('ink').onpointerup=finishInk;$('ink').onpointercancel=finishInk;$('ink').onlostpointercapture=finishInk;
$('prev').onclick=()=>moveWeek(-1);$('next').onclick=()=>moveWeek(1);$('today').onclick=()=>{countAnchor=iso(new Date());jumpWeeks(0)};$('add').onclick=()=>openEditor(null);$('settings').onclick=()=>{$('options').showModal()};$('closeOptions').onclick=()=>{$('options').close()};
function backup(){const data=readError?localStorage.getItem(KEY):JSON.stringify({format:'agenda-marzia',version:1,exportedAt:new Date().toISOString(),events},null,2);const url=URL.createObjectURL(new Blob([data||''],{type:'application/json'}));let a=document.createElement('a');a.href=url;a.download=`agenda-marzia-${iso(new Date())}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),20000)}$('export').onclick=$('backupQuick').onclick=backup;
$('import').onchange=async()=>{let file=$('import').files[0];if(!file)return;try{if(file.size>15000000)throw Error();let data=JSON.parse(await file.text());if(data.format!=='agenda-marzia'||data.version!==1||!Array.isArray(data.events)||!data.events.every(valid)||new Set(data.events.map(e=>e.id)).size!==data.events.length)throw Error();let duplicates=data.events.filter(e=>events.some(x=>x.id===e.id));let label=`Importare ${data.events.length} appuntamenti? Quelli già presenti con lo stesso identificativo (${duplicates.length}) saranno mantenuti. Gli altri saranno aggiunti.`;if(!confirm(label))return;const ids=new Set(events.map(x=>x.id));let extra=data.events.filter(x=>!ids.has(x.id));if(persist([...events,...extra])){render();$('importStatus').textContent=`Importati ${extra.length} appuntamenti. ${duplicates.length} già presenti mantenuti.`}}catch{$('importStatus').textContent='File non valido. Scegli un backup JSON esportato da Agenda Marzia (massimo 15 MB).'}finally{$('import').value=''}};
window.addEventListener('storage',e=>{if(e.key===KEY){if($('editor').open)notify('Dati cambiati in un’altra finestra. Chiudi e riapri l’appuntamento prima di modificarlo.');else{read();render()}}});
let countAnchor=selected;
function dayNumber(s){const d=from(s);return Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/86400000}
function countedWeeks(){return Math.round((dayNumber(iso(week))-dayNumber(iso(monday(from(countAnchor)))))/7)}
function renderWeekCounter(){
 $('countFrom').value=countAnchor;
 const n=countedWeeks(),delta=dayNumber(selected)-dayNumber(countAnchor);
 const label=n===0?'Settimana di partenza':`${n>0?'+':'−'}${Math.abs(n)} ${Math.abs(n)===1?'settimana':'settimane'}`;
 $('weekCount').textContent=`${label} · ${fmt(from(selected),{weekday:'long',day:'numeric',month:'long',year:'numeric'})}${delta===0?'':` · ${Math.abs(delta)} giorni ${delta>0?'dopo':'prima'}`}`;
 $('plusTwo').setAttribute('aria-pressed',String(selected===iso(plus(from(countAnchor),14))));
 $('plusThree').setAttribute('aria-pressed',String(selected===iso(plus(from(countAnchor),21))));
 $('plusFour').setAttribute('aria-pressed',String(selected===iso(plus(from(countAnchor),28))));
}
function jumpWeeks(n){selected=iso(plus(from(countAnchor),n*7));week=monday(from(selected));render()}
function moveWeek(n){selected=iso(plus(from(selected),n*7));week=monday(from(selected));render()}
$('plusTwo').onclick=()=>jumpWeeks(2);
$('plusThree').onclick=()=>jumpWeeks(3);
$('plusFour').onclick=()=>jumpWeeks(4);
$('returnStart').onclick=()=>jumpWeeks(0);
$('useSelected').onclick=()=>{countAnchor=selected;render()};
$('countFrom').onchange=()=>{let s=$('countFrom').value;if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||isNaN(from(s))||iso(from(s))!==s){$('countFrom').value=countAnchor;return}countAnchor=s;jumpWeeks(0)};
// A new handwritten block is a draft until explicitly saved.
let blockMode=false,blockDraft=null,blockCanvas=null;
const blockControls=['prev','next','today','plusTwo','plusThree','plusFour','returnStart','useSelected','countFrom','add','settings'];
function syncBlockTools(){
 $('calendar').classList.toggle('blocking',blockMode);
 $('drawBlock').setAttribute('aria-pressed',String(blockMode));
 $('drawBlock').textContent=blockMode?'Esci da penna e riquadri':'✎ Penna e riquadri';
 $('blockHelp').hidden=!blockMode;$('blockTools').hidden=!blockDraft;
 $('blockHelp').textContent=blockDraft?'Scrivi dentro il riquadro, poi premi Salva. Con “Penna” i tocchi del palmo non scrivono.':'Disegna un rettangolo o trascina dall’ora di inizio a quella di fine, con la penna o un dito. Scorri i giorni dalla riga delle date.';
 for(const id of blockControls)$(id).disabled=!!blockDraft;
 if(blockDraft)$('blockRange').textContent=`${fmt(from(blockDraft.date),{weekday:'long',day:'numeric',month:'short'})} · ${blockDraft.time}–${end(blockDraft)}`;
}
function selectionRange(low,high){
 const start=Math.max(540,Math.min(1140,540+Math.floor((low+1e-7)/15)*15));
 const finish=Math.min(1155,Math.max(start+15,540+Math.ceil((high-1e-7)/15)*15));
 return {time:`${String(Math.floor(start/60)).padStart(2,'0')}:${String(start%60).padStart(2,'0')}`,duration:finish-start};
}
function blockOverlaps(a){return events.some(e=>e.date===a.date&&mins(e.time)<mins(a.time)+a.duration&&mins(a.time)<mins(e.time)+e.duration)}
function startBlock(date,range){
 const draft={id:crypto.randomUUID(),date,...range,kind:'work',title:'',notes:'',strokes:[]};
 if(blockOverlaps(draft)){notify('Questo spazio contiene già un appuntamento. Scegli un orario libero.');return false}
 blockDraft=draft;selected=date;$('blockKind').value='work';render();return true;
}
function wireBlockLayer(layer,date){
 let gesture=null,preview=null;
 const offset=e=>Math.max(0,Math.min(615,(e.clientY-layer.getBoundingClientRect().top)/layer.getBoundingClientRect().height*615));
 const show=()=>{const r=selectionRange(gesture.low,gesture.high);preview.style.top=`${(mins(r.time)-540)/615*100}%`;preview.style.height=`${r.duration/615*100}%`;preview.textContent=`${r.time}–${end(r)}`};
 layer.onpointerdown=e=>{
  if(!blockMode||blockDraft||gesture||e.button!==0)return;
  e.preventDefault();const y=offset(e);gesture={id:e.pointerId,low:y,high:y,startY:e.clientY,moved:false};
  layer.setPointerCapture(e.pointerId);preview=el('div','block-preview');layer.append(preview);show();
 };
 layer.onpointermove=e=>{if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();const y=offset(e);gesture.low=Math.min(gesture.low,y);gesture.high=Math.max(gesture.high,y);gesture.moved=gesture.moved||Math.abs(e.clientY-gesture.startY)>6;show()};
 layer.onpointerup=e=>{if(!gesture||gesture.id!==e.pointerId)return;e.preventDefault();const r=selectionRange(gesture.low,gesture.high),moved=gesture.moved;gesture=null;preview.remove();preview=null;if(moved)startBlock(date,r)};
 const cancel=e=>{if(gesture?.id===e.pointerId){gesture=null;preview?.remove();preview=null}};
 layer.onpointercancel=cancel;layer.onlostpointercapture=cancel;
 if(blockDraft?.date===date)mountBlockCanvas(layer);
}
function mountBlockCanvas(layer){
 const draft=blockDraft,box=el('div','block-draft '+draft.kind);
 box.style.top=`${(mins(draft.time)-540)/615*100}%`;box.style.height=`${draft.duration/615*100}%`;
 const canvas=el('canvas','block-canvas');canvas.width=900;canvas.height=450;canvas.setAttribute('aria-label','Scrivi con la penna dentro il nuovo appuntamento');
 box.append(canvas);layer.append(box);const rect=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(rect.width*2));canvas.height=Math.max(1,Math.round(rect.height*2));blockCanvas=canvas;drawOn(canvas,draft.strokes);
 let active=null,line=null;
 const xy=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(900,(e.clientX-r.left)/r.width*900)),Math.max(0,Math.min(450,(e.clientY-r.top)/r.height*450))]};
 canvas.onpointerdown=e=>{
  if(e.button!==0||active!==null||e.pointerType==='touch'&&$('blockInput').value!=='touch')return;
  e.preventDefault();e.stopPropagation();if(draft.strokes.length>=3000){notify('Limite di tratti raggiunto. Salva questo appuntamento.');return}
  active=e.pointerId;canvas.setPointerCapture(active);line=[xy(e)];draft.strokes.push(line);drawOn(canvas,draft.strokes);
 };
 canvas.onpointermove=e=>{if(active!==e.pointerId||!line)return;e.preventDefault();if(line.length<20000)line.push(xy(e));drawOn(canvas,draft.strokes)};
 const finish=e=>{if(active===e.pointerId){active=null;line=null}};canvas.onpointerup=finish;canvas.onpointercancel=finish;canvas.onlostpointercapture=finish;
}
function cancelBlock(){if(blockDraft?.strokes.length&&!confirm('Annullare questo nuovo riquadro e la sua scrittura?'))return false;blockDraft=null;blockCanvas=null;render();return true}
$('drawBlock').onclick=()=>{if(blockDraft&&!cancelBlock())return;blockMode=!blockMode;render()};
$('blockCancel').onclick=cancelBlock;
$('blockUndo').onclick=()=>{if(blockDraft){blockDraft.strokes.pop();drawOn(blockCanvas,blockDraft.strokes)}};
$('blockKind').onchange=()=>{if(blockDraft){blockDraft.kind=$('blockKind').value;render()}};
$('blockSave').onclick=()=>{
 if(!blockDraft)return;
 if(!blockDraft.strokes.some(s=>s.length)){notify('Scrivi prima qualcosa dentro il riquadro.');return}
 if(!valid(blockDraft)){notify('Impossibile salvare questo riquadro. Controlla la scrittura e gli orari.');return}
 if(blockOverlaps(blockDraft)){notify('Questo orario ora contiene un altro appuntamento. Annulla il riquadro e scegli uno spazio libero.');return}
 if(persist([...events,blockDraft])){blockDraft=null;blockCanvas=null;render();notify('Appuntamento scritto a mano salvato.')}
};
window.addEventListener('beforeunload',e=>{if(blockDraft?.strokes.length){e.preventDefault();e.returnValue=''}});

read();render();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});

// Personal cover palette; appointment records remain independent.
function setPalette(name){if(!['lavanda','rosa','salvia'].includes(name))name='lavanda';document.body.dataset.theme=name;document.querySelectorAll('[data-palette]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.palette===name)))}
try{setPalette(localStorage.getItem('agenda-marzia-palette')||'lavanda')}catch{setPalette('lavanda')}
document.querySelectorAll('[data-palette]').forEach(b=>{b.onclick=()=>{setPalette(b.dataset.palette);try{localStorage.setItem('agenda-marzia-palette',b.dataset.palette)}catch{notify('Colore applicato. Non è stato possibile memorizzare la preferenza.')}}});
