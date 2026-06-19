const posts = [
  {id:1,date:'2026-06-02',time:'7:00 PM',platform:'Instagram',type:'Carousel',status:'Approved',title:'Dining and dancing at Box Hub',caption:'A room that can move from dinner to dancing without missing a beat.',image:'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=700&q=80',reason:'Tuesday evenings suit event inspiration and venue browsing.'},
  {id:2,date:'2026-06-04',time:'3:00 PM',platform:'LinkedIn',type:'Single post',status:'Awaiting approval',title:'Flexible event spaces',caption:'A practical look at how the venue can adapt for corporate and private events.',image:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=700&q=80',reason:'Mid-afternoon LinkedIn timing suits professionals planning future events.'},
  {id:3,date:'2026-06-08',time:'10:00 AM',platform:'Instagram',type:'Carousel',status:'Approved',title:'A blank canvas for your event',caption:'From the first setup to the final guest arrival, the space is designed to work around you.',image:'https://images.unsplash.com/photo-1507501336603-6e31db2be093?auto=format&fit=crop&w=700&q=80',reason:'Monday morning gives planners time to save and revisit venue ideas.'},
  {id:4,date:'2026-06-13',time:'11:00 AM',platform:'Instagram',type:'Carousel',status:'Approved',title:'Outdoor event possibilities',caption:'A closer look at the outdoor space and the ways it can support a relaxed celebration.',image:'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=700&q=80',reason:'Weekend late morning suits relaxed event inspiration.'},
  {id:5,date:'2026-06-17',time:'2:00 PM',platform:'LinkedIn',type:'Single post',status:'Awaiting approval',title:'Professional event presentation',caption:'Clear signage, practical layouts and a setup designed to keep the event running smoothly.',image:'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=700&q=80',reason:'Wednesday afternoon performs well for professional venue content.'},
  {id:6,date:'2026-06-19',time:'6:00 PM',platform:'Instagram',type:'Carousel',status:'Approved',title:'Wedding and celebration spaces',caption:'A setting that can feel polished, personal and completely your own.',image:'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=700&q=80',reason:'Friday evening aligns with weekend planning and celebration content.'},
  {id:7,date:'2026-06-24',time:'7:30 PM',platform:'Instagram',type:'Single post',status:'Approved',title:'A full room and a great atmosphere',caption:'Exactly the kind of energy we love seeing in the venue.',image:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=80',reason:'Evening engagement is stronger for lively event content.'},
  {id:8,date:'2026-06-28',time:'4:00 PM',platform:'Instagram',type:'Single post',status:'Awaiting approval',title:'Venue details that make a difference',caption:'Small details, warm lighting and a space ready to be made your own.',image:'https://images.unsplash.com/photo-1507501336603-6e31db2be093?auto=format&fit=crop&w=700&q=80',reason:'Sunday afternoon suits relaxed browsing and future event planning.'}
];

const unscheduled = [
  {title:'Behind the scenes setup',type:'Story set',image:'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=300&q=80'},
  {title:'Guest arrival moments',type:'Carousel',image:'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=300&q=80'}
];

let currentDate = new Date(2026,5,1);
let activePost = null;
const monthGrid = document.getElementById('monthGrid');
const monthTitle = document.getElementById('monthTitle');
const summaryMonth = document.getElementById('summaryMonth');
const modal = document.getElementById('modalBackdrop');
const toast = document.getElementById('toast');

function renderCalendar(){
  const year=currentDate.getFullYear(),month=currentDate.getMonth();
  const label=currentDate.toLocaleString('en-GB',{month:'long',year:'numeric'});
  monthTitle.textContent=label;summaryMonth.textContent=label;monthGrid.innerHTML='';
  const first=new Date(year,month,1);
  const mondayIndex=(first.getDay()+6)%7;
  const daysInMonth=new Date(year,month+1,0).getDate();
  const prevDays=new Date(year,month,0).getDate();
  for(let i=0;i<42;i++){
    let dayNum,cellMonth=month,cellYear=year,outside=false;
    if(i<mondayIndex){dayNum=prevDays-mondayIndex+i+1;cellMonth=month-1;outside=true;if(cellMonth<0){cellMonth=11;cellYear--}}
    else if(i>=mondayIndex+daysInMonth){dayNum=i-(mondayIndex+daysInMonth)+1;cellMonth=month+1;outside=true;if(cellMonth>11){cellMonth=0;cellYear++}}
    else dayNum=i-mondayIndex+1;
    const dateKey=`${cellYear}-${String(cellMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    const cell=document.createElement('div');cell.className='day-cell'+(outside?' outside':'');
    const num=document.createElement('div');num.className='day-number';num.textContent=dayNum;cell.appendChild(num);
    posts.filter(p=>p.date===dateKey).forEach(p=>cell.appendChild(makePostCard(p)));
    monthGrid.appendChild(cell);
  }
  updateSummary(year,month);
}

function makePostCard(post){
  const card=document.createElement('article');card.className='post-card';card.innerHTML=`
    <img src="${post.image}" alt="${post.title}">
    <div class="post-body">
      <div class="post-meta"><span class="platform-tag ${post.platform.toLowerCase()}">${post.platform}</span><span class="post-time">${post.time}</span></div>
      <h4 class="post-title">${post.title}</h4>
      <p class="post-caption">${post.caption}</p>
      <div class="status-line"><span class="status-dot ${post.status.startsWith('Approved')?'approved':'awaiting'}"></span>${post.status}</div>
    </div>`;
  card.addEventListener('click',()=>openPost(post));return card;
}

function updateSummary(year,month){
  const monthPosts=posts.filter(p=>{const d=new Date(p.date+'T12:00:00');return d.getFullYear()===year&&d.getMonth()===month});
  document.getElementById('instagramCount').textContent=monthPosts.filter(p=>p.platform==='Instagram').length;
  document.getElementById('linkedinCount').textContent=monthPosts.filter(p=>p.platform==='LinkedIn').length;
  document.getElementById('approvedCount').textContent=monthPosts.filter(p=>p.status==='Approved').length;
  document.getElementById('awaitingCount').textContent=monthPosts.filter(p=>p.status!=='Approved').length;
}

function renderUnscheduled(){
  const list=document.getElementById('unscheduledList');list.innerHTML='';
  unscheduled.forEach(item=>{const card=document.createElement('div');card.className='unscheduled-card';card.innerHTML=`<img src="${item.image}" alt="${item.title}"><div><h4>${item.title}</h4><p>${item.type} · ready to schedule</p></div>`;list.appendChild(card)});
}

function openPost(post){
  activePost=post;document.getElementById('modalImage').src=post.image;document.getElementById('modalTitle').textContent=post.title;document.getElementById('modalCaption').textContent=post.caption;document.getElementById('modalTags').innerHTML=`<span class="platform-tag ${post.platform.toLowerCase()}">${post.platform}</span><span class="platform-tag linkedin">${post.type}</span><span class="platform-tag instagram">${post.time}</span>`;document.getElementById('modalReason').textContent=`Why this time: ${post.reason}`;document.getElementById('approveBtn').textContent=post.status==='Approved'?'Approved':'Approve post';modal.classList.remove('hidden');
}

function showToast(message){toast.textContent=message;toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),2200)}

document.getElementById('prevMonth').onclick=()=>{currentDate=new Date(currentDate.getFullYear(),currentDate.getMonth()-1,1);renderCalendar()};
document.getElementById('nextMonth').onclick=()=>{currentDate=new Date(currentDate.getFullYear(),currentDate.getMonth()+1,1);renderCalendar()};
document.getElementById('modalClose').onclick=()=>modal.classList.add('hidden');
modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.add('hidden')});
document.getElementById('approveBtn').onclick=()=>{if(!activePost)return;activePost.status='Approved';renderCalendar();openPost(activePost);showToast('Post approved')};
document.getElementById('addGoogleBtn').onclick=()=>{if(!activePost)return;const start=activePost.date.replaceAll('-','')+'T'+to24(activePost.time)+'00';const url=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('PicPlanr: '+activePost.title)}&dates=${start}/${start}&details=${encodeURIComponent(activePost.caption)}`;window.open(url,'_blank')};
document.getElementById('googleBtn').onclick=()=>showToast('Google Calendar connection will use secure Google sign-in in the live version.');
document.getElementById('exportBtn').onclick=exportICS;
document.getElementById('newPostBtn').onclick=()=>showToast('New content flow will open the upload and approval stage.');
function to24(time){const [t,period]=time.split(' ');let [h,m]=t.split(':').map(Number);if(period==='PM'&&h!==12)h+=12;if(period==='AM'&&h===12)h=0;return String(h).padStart(2,'0')+String(m).padStart(2,'0')}
function exportICS(){const events=posts.map(p=>`BEGIN:VEVENT\nSUMMARY:PicPlanr: ${p.title}\nDTSTART:${p.date.replaceAll('-','')}T${to24(p.time)}00\nDESCRIPTION:${p.caption.replace(/\n/g,' ')}\nEND:VEVENT`).join('\n');const blob=new Blob([`BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//PicPlanr//Calendar//EN\n${events}\nEND:VCALENDAR`],{type:'text/calendar'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='picplanr-month.ics';a.click();URL.revokeObjectURL(a.href);showToast('Calendar file downloaded')}
renderCalendar();renderUnscheduled();
