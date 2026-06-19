const $=id=>document.getElementById(id);const state={accountType:'Business',profile:null,files:[],images:[],groups:[],approved:new Set()};
const titles={onboarding:'Account setup',connections:'Connected accounts',audit:'Account review',upload:'Upload folder',posts:'Post groups',calendar:'Smart calendar'};
function show(step){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(step).classList.add('active');document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.step===step));$('title').textContent=titles[step]}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>show(b.dataset.step));document.querySelectorAll('.account-choice').forEach(b=>b.onclick=()=>{state.accountType=b.dataset.type;document.querySelectorAll('.account-choice').forEach(x=>x.classList.toggle('selected',x===b));$('goal').innerHTML=state.accountType==='Business'?'<option>Increase enquiries</option><option>Build trust</option><option>Increase sales</option><option>Promote partnerships</option>':'<option>Grow engagement</option><option>Grow followers</option><option>Build a personal brand</option><option>Secure brand partnerships</option><option>Share consistently</option>'});
function context(){return{accountType:state.accountType,name:$('accountName').value.trim(),industry:$('industry').value.trim(),platform:$('platform').value,goal:$('goal').value,instagram:$('instagram').value.trim(),linkedin:$('linkedin').value.trim(),website:$('website').value.trim(),competitors:$('competitors').value.trim(),avoid:$('avoid').value.trim()}}
async function api(action,payload){const r=await fetch('/api/picplanr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Something went wrong.');return b}
$('buildProfile').onclick=async()=>{const btn=$('buildProfile');btn.disabled=true;btn.textContent='Analysing…';try{state.profile=(await api('profile',{context:context()})).profile;renderProfile();$('statusPill').textContent='Voice profile ready';}catch(e){alert(e.message)}finally{btn.disabled=false;btn.textContent='Analyse account'}};
function renderProfile(){const p=state.profile;$('profileResult').classList.remove('hidden');$('profileResult').innerHTML=`<h3>Your ${state.accountType==='Business'?'brand':'personal'} voice</h3><p>${esc(p.summary)}</p><div class="tags">${(p.voice_traits||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div><p><strong>Content direction:</strong> ${esc(p.content_direction)}</p><p><strong>How PicPlanr should write:</strong> ${esc(p.writing_rules)}</p>${p.confidence_note?`<p class="confidence-note"><strong>Current understanding:</strong> ${esc(p.confidence_note)}</p>`:''}`}
$('runAudit').onclick=async()=>{try{const data=await api('audit',{context:context(),profile:state.profile});const a=data.audit;$('auditResult').className='audit-grid';$('auditResult').innerHTML=`<div class="audit-box"><h3>Strong foundations</h3><ul>${a.strengths.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="audit-box"><h3>Improve next</h3><ul>${a.improvements.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="audit-box"><h3>Recommended actions</h3><ul>${a.actions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`}catch(e){alert(e.message)}};
$('chooseFolder').onclick=()=>$('folderInput').click();$('chooseFiles').onclick=e=>{e.stopPropagation();$('fileInput').click()};$('drop').onclick=()=>$('fileInput').click();$('folderInput').onchange=e=>loadFiles(e.target.files);$('fileInput').onchange=e=>loadFiles(e.target.files);$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();loadFiles(e.dataTransfer.files)};
function loadFiles(list){state.files=Array.from(list).filter(f=>f.type.startsWith('image/')).slice(0,50);$('previewGrid').innerHTML='';state.files.forEach(f=>{const u=URL.createObjectURL(f),d=document.createElement('div');d.className='preview';d.innerHTML=`<img src="${u}"><span>${esc(f.name)}</span>`;$('previewGrid').appendChild(d)});$('analyseFolder').classList.toggle('hidden',!state.files.length);$('statusPill').textContent=`${state.files.length} images selected`}
async function compress(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const max=1400,s=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.72))};img.onerror=reject;img.src=url})}
$('analyseFolder').onclick=async()=>{if(!state.profile){alert('Please create the account voice profile first.');show('onboarding');return}const total=state.files.length;$('progressWrap').classList.remove('hidden');state.images=[];try{for(let i=0;i<total;i++){$('progressText').textContent=`Analysing ${state.files[i].name}`;$('progressCount').textContent=`${i+1} / ${total}`;$('progressBar').style.width=`${Math.round(i/total*100)}%`;const dataUrl=await compress(state.files[i]);const out=await api('image',{context:context(),profile:state.profile,image:{name:state.files[i].name,dataUrl}});state.images.push({...out.analysis,localImage:dataUrl,filename:state.files[i].name,index:i})}$('progressText').textContent='Grouping related images and writing captions…';const grouped=await api('group',{context:context(),profile:state.profile,images:state.images.map(({localImage,...x})=>x)});state.groups=grouped.groups.map(g=>({...g,images:g.image_indexes.map(i=>state.images[i]).filter(Boolean),selected:0}));$('progressBar').style.width='100%';renderGroups();show('posts');$('statusPill').textContent=`${state.groups.length} post groups created`}catch(e){alert(e.message)}};
function renderGroups(){if(!state.groups.length)return;$('groups').className='';$('groups').innerHTML=state.groups.map((g,gi)=>`<article class="group-card"><div class="group-top"><div class="collage">${g.images.slice(0,4).map(i=>`<img src="${i.localImage}">`).join('')}</div><div><div class="group-meta"><span class="tag">${esc(g.format)}</span><span class="tag">${g.images.length} image${g.images.length===1?'':'s'}</span><span class="tag">${esc(g.objective)}</span></div><h2>${esc(g.title)}</h2><p>${esc(g.group_reason)}</p><div class="reason"><strong>Recommended time:</strong> ${esc(g.schedule.day)} at ${esc(g.schedule.time)} — ${esc(g.schedule.reason)}</div></div></div><div class="caption-options">${g.captions.map((c,ci)=>`<div class="caption-option ${ci===g.selected?'selected':''}" data-g="${gi}" data-c="${ci}"><strong>${esc(c.label)}</strong><p>${esc(c.text)}</p></div>`).join('')}</div><button class="primary approve-group" data-g="${gi}">${state.approved.has(gi)?'Approved':'Approve selected caption'}</button></article>`).join('');document.querySelectorAll('.caption-option').forEach(x=>x.onclick=()=>{state.groups[+x.dataset.g].selected=+x.dataset.c;renderGroups()});document.querySelectorAll('.approve-group').forEach(x=>x.onclick=()=>{state.approved.add(+x.dataset.g);renderGroups()})}
$('approveAll').onclick=()=>{state.groups.forEach((_,i)=>state.approved.add(i));renderGroups()};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}


let calendarDate=new Date();let scheduledPosts=[];let activePost=null;
const dayMap={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};

function parseTime(text){
  const m=String(text||'10:00 AM').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if(!m)return{h:10,m:0};
  let h=+m[1],min=+m[2],ap=(m[3]||'').toUpperCase();
  if(ap==='PM'&&h<12)h+=12;
  if(ap==='AM'&&h===12)h=0;
  return{h,m:min}
}
function nextDateForDay(base,dayName,used){
  const target=dayMap[dayName]??1;
  const d=new Date(base.getFullYear(),base.getMonth(),1);
  let add=(target-d.getDay()+7)%7;
  d.setDate(1+add);
  while(used.has(d.toDateString()))d.setDate(d.getDate()+7);
  used.add(d.toDateString());
  return d
}
function buildScheduledPosts(){
  const approved=[...state.approved].map(i=>({group:state.groups[i],groupIndex:i}));
  if(!approved.length){alert('Approve at least one post group first.');return false}
  const used=new Set();
  scheduledPosts=approved.map(({group,groupIndex})=>{
    const date=nextDateForDay(calendarDate,group.schedule.day,used);
    const t=parseTime(group.schedule.time);date.setHours(t.h,t.m,0,0);
    const selected=group.captions[group.selected]||group.captions[0];
    return{
      id:`post-${groupIndex}`,groupIndex,title:group.title,format:group.format,
      objective:group.objective,reason:group.schedule.reason,platform:context().platform,
      image:group.images[0]?.localImage||'',caption:selected?.text||'',date
    }
  });
  renderWeek();
  renderMonth();
  $('calendarReady').classList.remove('hidden');
  $('makeSchedule').textContent='Rebuild schedule';
  return true
}
$('makeSchedule').onclick=()=>buildScheduledPosts();
$('prevMonth').onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderMonth()};
$('nextMonth').onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderMonth()};

function startOfWeek(date){
  const d=new Date(date); const diff=(d.getDay()+6)%7;
  d.setDate(d.getDate()-diff); d.setHours(0,0,0,0); return d
}
function renderWeek(){
  const holder=$('weekSchedule');
  if(!scheduledPosts.length){holder.innerHTML='<div class="empty">Build your schedule to see this week.</div>';return}
  const base=startOfWeek(new Date());
  const seven=[...Array(7)].map((_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return d});
  $('weekRange').textContent=`${seven[0].toLocaleDateString([], {day:'numeric',month:'short'})} – ${seven[6].toLocaleDateString([], {day:'numeric',month:'short',year:'numeric'})}`;
  holder.innerHTML=seven.map(d=>{
    let posts=scheduledPosts.filter(p=>p.date.getDay()===d.getDay());
    const day= d.toLocaleDateString([], {weekday:'short'});
    const num=d.getDate();
    if(!posts.length)return `<div class="week-day"><div class="week-date"><span>${day}</span><strong>${num}</strong></div><div class="week-empty">No post</div></div>`;
    return `<div class="week-day has-post"><div class="week-date"><span>${day}</span><strong>${num}</strong></div>${posts.map(p=>`
      <article class="week-post" data-id="${p.id}">
        <img src="${p.image}" alt="${esc(p.title)}">
        <div class="week-post-copy">
          <div class="week-meta"><span>${formatTime(p.date)}</span><span class="platform-badge">${esc(p.platform)}</span></div>
          <h4>${esc(p.title)}</h4>
          <p>${esc(p.caption)}</p>
        </div>
      </article>`).join('')}</div>`
  }).join('');
  holder.querySelectorAll('.week-post').forEach(el=>el.onclick=()=>openPost(el.dataset.id))
}
function renderMonth(){
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  $('monthTitle').textContent=`${monthNames[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`;
  $('calendarSummary').textContent=scheduledPosts.length?`${scheduledPosts.length} approved posts scheduled. Click any image to see the full caption.`:'Approve post groups, then build your schedule.';
  const schedule=$('schedule');
  schedule.className=scheduledPosts.length?'month-calendar':'month-calendar empty';
  if(!scheduledPosts.length){schedule.textContent='Approve post groups first.';return}
  const first=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1),start=new Date(first);
  start.setDate(first.getDate()-first.getDay());
  let html=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<div class="weekday">${d}</div>`).join('');
  for(let i=0;i<42;i++){
    const d=new Date(start);d.setDate(start.getDate()+i);
    const inMonth=d.getMonth()===calendarDate.getMonth();
    const today=new Date();const isToday=d.toDateString()===today.toDateString();
    const posts=scheduledPosts.filter(p=>p.date.toDateString()===d.toDateString());
    html+=`<div class="day-cell ${inMonth?'':'outside'}">
      <div class="day-number ${isToday?'today':''}">${d.getDate()}</div>
      ${posts.map(p=>`<article class="calendar-post" data-id="${p.id}">
        <img src="${p.image}" alt="${esc(p.title)}">
        <div class="calendar-post-body">
          <div class="calendar-post-top"><span>${formatTime(p.date)}</span><span class="platform-badge">${esc(p.platform)}</span></div>
          <h4>${esc(p.title)}</h4>
          <p class="calendar-caption">${esc(p.caption)}</p>
        </div>
      </article>`).join('')}
    </div>`
  }
  schedule.innerHTML=html;
  schedule.querySelectorAll('.calendar-post').forEach(el=>el.onclick=()=>openPost(el.dataset.id))
}
function formatTime(d){return d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
function openPost(id){
  activePost=scheduledPosts.find(p=>p.id===id);if(!activePost)return;
  $('modalImage').src=activePost.image;$('modalTitle').textContent=activePost.title;
  $('modalWhen').textContent=`${activePost.date.toLocaleDateString([], {weekday:'long',day:'numeric',month:'long'})} at ${formatTime(activePost.date)}`;
  $('modalCaption').value=activePost.caption;$('modalReason').textContent=`Why this time: ${activePost.reason}`;
  $('modalTags').innerHTML=`<span class="tag">${esc(activePost.platform)}</span><span class="tag">${esc(activePost.format)}</span><span class="tag">${esc(activePost.objective)}</span>`;
  $('postModal').classList.remove('hidden')
}
$('closeModal').onclick=()=>$('postModal').classList.add('hidden');
$('postModal').onclick=e=>{if(e.target===$('postModal'))$('postModal').classList.add('hidden')};
$('saveCaption').onclick=()=>{if(activePost){activePost.caption=$('modalCaption').value;renderWeek();renderMonth();$('postModal').classList.add('hidden')}};
$('addGooglePost').onclick=()=>{if(!activePost)return;const start=activePost.date.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),end=new Date(activePost.date.getTime()+30*60000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z'),url=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('PicPlanr - '+activePost.title)}&dates=${start}/${end}&details=${encodeURIComponent(activePost.caption+'\n\nPlatform: '+activePost.platform)}`;window.open(url,'_blank')};
$('connectGoogle').onclick=()=>alert('The calendar export works now. A live automatic Google Calendar connection will require Google sign-in and permission setup.');
$('exportCalendar').onclick=()=>{
  if(!scheduledPosts.length){alert('Build the schedule first.');return}
  const pad=n=>String(n).padStart(2,'0'),stamp=d=>`${d.getUTCFullYear()}${pad(d.getUTCMonth()+1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
  const events=scheduledPosts.map(p=>{const end=new Date(p.date.getTime()+30*60000);return ['BEGIN:VEVENT',`UID:${p.id}@picplanr`,`DTSTAMP:${stamp(new Date())}`,`DTSTART:${stamp(p.date)}`,`DTEND:${stamp(end)}`,`SUMMARY:PicPlanr - ${p.title.replace(/[,;]/g,'')}`,`DESCRIPTION:${p.caption.replace(/\n/g,'\\n').replace(/[,;]/g,' ')}\\nPlatform: ${p.platform}`,'END:VEVENT'].join('\r\n')}).join('\r\n');
  const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PicPlanr//Content Calendar//EN',events,'END:VCALENDAR'].join('\r\n');
  const blob=new Blob([ics],{type:'text/calendar'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`PicPlanr-${$('monthTitle').textContent.replace(/ /g,'-')}.ics`;a.click();URL.revokeObjectURL(a.href)
};

// Automatically create the visual schedule when the user opens the calendar after approvals.
document.querySelectorAll('.nav').forEach(b=>b.addEventListener('click',()=>{
  if(b.dataset.step==='calendar' && state.approved.size && !scheduledPosts.length) buildScheduledPosts()
}));
renderMonth();


// V4 connection and automatic publishing foundation
const connectionState={instagram:false,linkedin:false,configured:false,testMode:true};
async function loadPublishingStatus(){
  try{
    const r=await fetch('/api/publishing/status');
    const data=await r.json();
    connectionState.configured=!!data.configured;
    connectionState.testMode=!!data.testMode;
    connectionState.instagram=!!data.instagramConnected;
    connectionState.linkedin=!!data.linkedinConnected;
    updateConnectionUI(data);
  }catch(e){updateConnectionUI({configured:false,testMode:true})}
}
function updateConnectionUI(data){
  const pairs=[['instagram',data.instagramConnected],['linkedin',data.linkedinConnected]];
  pairs.forEach(([name,connected])=>{
    const status=$(name+'Status'),btn=$('connect'+name[0].toUpperCase()+name.slice(1));
    if(status)status.textContent=connected?'Connected':'Not connected';
    const card=btn?.closest('.connection-card');
    card?.classList.toggle('connected',!!connected);
    if(btn)btn.textContent=connected?'Connected':'Connect '+(name==='instagram'?'Instagram':'LinkedIn');
  });
  const count=[data.instagramConnected,data.linkedinConnected].filter(Boolean).length;
  if($('connectionSummary'))$('connectionSummary').textContent=count?`${count} account${count===1?'':'s'} connected`:'No accounts connected';
  const readiness={
    readyDatabase:data.databaseReady,
    readyStorage:data.storageReady,
    readyInstagram:data.instagramConfigured,
    readyLinkedIn:data.linkedinConfigured,
    readyScheduler:data.schedulerReady
  };
  Object.entries(readiness).forEach(([id,ready])=>{const el=$(id);if(el){el.textContent=ready?'✓':'○';el.classList.toggle('ready',!!ready)}})
  if($('setupMessage'))$('setupMessage').innerHTML=data.configured
    ?'<strong>Publishing foundation ready</strong><span>Connect an approved social account, then save the calendar to the publishing queue.</span>'
    :'<strong>Safe test mode</strong><span>The queue and status flow can be tested now. Real publishing activates after Supabase, storage and platform credentials are added.</span>';
}
async function beginConnection(provider){
  try{
    const r=await fetch(`/api/oauth/${provider}/start`);
    const data=await r.json();
    if(data.url){window.location.href=data.url;return}
    alert(data.message||`${provider} connection is not configured yet.`);
  }catch(e){alert('Connection setup is not available yet.')}
}
$('connectInstagram').onclick=()=>beginConnection('instagram');
$('connectLinkedIn').onclick=()=>beginConnection('linkedin');

async function savePublishingQueue(){
  if(!scheduledPosts.length){alert('Build the schedule first.');return}
  const payload=scheduledPosts.map(p=>({
    local_id:p.id,
    platform:String(p.platform||'').toLowerCase(),
    title:p.title,
    caption:p.caption,
    scheduled_for:p.date.toISOString(),
    media_url:p.image,
    status:'scheduled',
    post_format:p.format
  }));
  try{
    const r=await fetch('/api/publishing/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({posts:payload})});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||'Could not save publishing queue.');
    scheduledPosts.forEach(p=>p.publishStatus='Scheduled');
    alert(data.message||'Posts saved to the publishing queue.');
    renderWeek();renderMonth();
  }catch(e){alert(e.message)}
}
if($('savePublishingQueue'))$('savePublishingQueue').onclick=savePublishingQueue;

// Add publishing state to modal.
const originalOpenPost=openPost;
openPost=function(id){
  originalOpenPost(id);
  if(activePost&&$('modalPublishStatus'))$('modalPublishStatus').textContent=activePost.publishStatus||'Draft';
};
loadPublishingStatus();
