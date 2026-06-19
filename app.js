const posts = [
  {id:1,date:'2026-06-02',time:'19:00',title:'Venue transformation carousel',platform:'Instagram',type:'Carousel',status:'Approved',image:'assets/desk.jpg',caption:'From blank space to a room ready for a full evening of celebrations.',reason:'Tuesday evening is the strongest predicted Instagram slot.'},
  {id:2,date:'2026-06-04',time:'09:30',title:'Corporate event case study',platform:'LinkedIn',type:'Single post',status:'Approved',image:'assets/camera.jpg',caption:'A look at how the venue was adapted for a professional event with a flexible layout and full production support.',reason:'Weekday mornings suit professional audiences.'},
  {id:3,date:'2026-06-06',time:'11:00',title:'Weekend atmosphere',platform:'Instagram',type:'Carousel',status:'Awaiting approval',image:'assets/mountains.jpg',caption:'The kind of atmosphere that makes the whole room feel alive.',reason:'Saturday late morning is a useful lifestyle-content window.'},
  {id:4,date:'2026-06-09',time:'19:15',title:'Inside the venue',platform:'Instagram',type:'Single post',status:'Approved',image:'assets/plant.jpg',caption:'A closer look at one of the spaces that can be shaped around your event.',reason:'Evening browsing time suits venue inspiration content.'},
  {id:5,date:'2026-06-11',time:'10:00',title:'Business partnership post',platform:'LinkedIn',type:'Single post',status:'Approved',image:'assets/coast.jpg',caption:'Another strong collaboration brought to life through careful planning, production and a flexible space.',reason:'Thursday morning is a strong professional posting window.'},
  {id:6,date:'2026-06-13',time:'18:30',title:'People-focused event moment',platform:'Instagram',type:'Carousel',status:'Awaiting approval',image:'assets/camera.jpg',caption:'The room matters, but the people and atmosphere are what bring it to life.',reason:'Saturday evening supports social event content.'},
  {id:7,date:'2026-06-16',time:'19:00',title:'Booking-focused venue post',platform:'Instagram',type:'Single post',status:'Approved',image:'assets/desk.jpg',caption:'Planning an event in Glasgow? Our team can help shape the space around the occasion.',reason:'Tuesday evening is a high-intent planning window.'},
  {id:8,date:'2026-06-18',time:'09:00',title:'Behind the scenes planning',platform:'LinkedIn',type:'Single post',status:'Approved',image:'assets/plant.jpg',caption:'A look at the preparation that happens before guests arrive and the event begins.',reason:'Early weekday posts suit behind-the-scenes business content.'},
  {id:9,date:'2026-06-20',time:'12:00',title:'Weekend venue details',platform:'Instagram',type:'Carousel',status:'Approved',image:'assets/mountains.jpg',caption:'The smaller details make a big difference when the whole room comes together.',reason:'Midday weekend browsing suits visual detail posts.'},
  {id:10,date:'2026-06-23',time:'18:45',title:'Event highlight carousel',platform:'Instagram',type:'Carousel',status:'Approved',image:'assets/coast.jpg',caption:'A full room, a brilliant crowd and exactly the kind of atmosphere we love to see.',reason:'Tuesday evenings remain the best predicted engagement window.'},
  {id:11,date:'2026-06-25',time:'10:30',title:'Flexible event space',platform:'LinkedIn',type:'Single post',status:'Awaiting approval',image:'assets/desk.jpg',caption:'A flexible venue can make a major difference to how an event flows from arrival through to the final guest leaving.',reason:'Late morning supports professional discovery.'},
  {id:12,date:'2026-06-27',time:'19:00',title:'Saturday celebration post',platform:'Instagram',type:'Single post',status:'Approved',image:'assets/camera.jpg',caption:'Another Saturday filled with good people, great energy and a room ready to celebrate.',reason:'Weekend evening timing matches the content and audience mindset.'},
  {id:13,date:'2026-06-30',time:'19:00',title:'End of month recap',platform:'Instagram',type:'Carousel',status:'Approved',image:'assets/plant.jpg',caption:'A look back at some of the moments that made this month a busy one.',reason:'A month-end evening recap encourages reflection and engagement.'}
];

let currentYear=2026,currentMonth=5,activePost=null;
const monthGrid=document.getElementById('monthGrid');
const monthLabel=document.getElementById('monthLabel');
const modalBackdrop=document.getElementById('modalBackdrop');
const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];

function render(){
  monthLabel.textContent=`${monthNames[currentMonth]} ${currentYear}`;
  monthGrid.innerHTML='';
  const firstDay=new Date(currentYear,currentMonth,1).getDay();
  const daysInMonth=new Date(currentYear,currentMonth+1,0).getDate();
  const prevDays=new Date(currentYear,currentMonth,0).getDate();
  const totalCells=42;
  for(let i=0;i<totalCells;i++){
    const cell=document.createElement('div');cell.className='day-cell';
    let dayNum,cellMonth=currentMonth,cellYear=currentYear,outside=false;
    if(i<firstDay){dayNum=prevDays-firstDay+i+1;cellMonth=currentMonth-1;outside=true}
    else if(i>=firstDay+daysInMonth){dayNum=i-(firstDay+daysInMonth)+1;cellMonth=currentMonth+1;outside=true}
    else dayNum=i-firstDay+1;
    if(cellMonth<0){cellMonth=11;cellYear--} if(cellMonth>11){cellMonth=0;cellYear++}
    const dateStr=`${cellYear}-${String(cellMonth+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    if(outside)cell.classList.add('outside');
    if(dateStr==='2026-06-19')cell.classList.add('today');
    cell.innerHTML=`<div class="day-number"><strong>${dayNum}</strong></div>`;
    const dayPosts=posts.filter(p=>p.date===dateStr).sort((a,b)=>a.time.localeCompare(b.time));
    dayPosts.slice(0,2).forEach(post=>cell.appendChild(createPostMini(post)));
    if(dayPosts.length>2){const more=document.createElement('div');more.className='more-count';more.textContent=`+${dayPosts.length-2} more`;cell.appendChild(more)}
    monthGrid.appendChild(cell);
  }
  updateCounts();
}

function createPostMini(post){
  const card=document.createElement('article');card.className='post-mini';
  const platformClass=post.platform.toLowerCase();
  const statusTag=post.status!=='Approved'?'<span class="tag awaiting">Review</span>':'';
  card.innerHTML=`<img src="${post.image}" alt="${post.title}"><div class="post-copy"><div class="post-time">${formatTime(post.time)}</div><div class="post-title">${post.title}</div><div class="post-tags"><span class="tag ${platformClass}">${post.platform}</span>${statusTag}</div></div>`;
  card.addEventListener('click',()=>openModal(post));return card;
}

function updateCounts(){
  const visible=posts.filter(p=>{const d=new Date(`${p.date}T12:00:00`);return d.getFullYear()===currentYear&&d.getMonth()===currentMonth});
  document.getElementById('scheduledCount').textContent=visible.length;
  document.getElementById('instagramCount').textContent=visible.filter(p=>p.platform==='Instagram').length;
  document.getElementById('linkedinCount').textContent=visible.filter(p=>p.platform==='LinkedIn').length;
}

function openModal(post){
  activePost=post;document.getElementById('modalImage').src=post.image;document.getElementById('modalTitle').textContent=post.title;document.getElementById('modalCaption').textContent=post.caption;
  document.getElementById('modalMeta').innerHTML=`<span>${post.platform}</span><span>${post.type}</span><span>${post.status}</span>`;
  document.getElementById('modalInfo').innerHTML=`<strong>Scheduled:</strong> ${formatDate(post.date)} at ${formatTime(post.time)}<br><strong>Why this time:</strong> ${post.reason}`;
  document.getElementById('approveBtn').textContent=post.status==='Approved'?'Approved':'Approve post';modalBackdrop.classList.remove('hidden');
}
function closeModal(){modalBackdrop.classList.add('hidden');activePost=null}

document.getElementById('modalClose').addEventListener('click',closeModal);modalBackdrop.addEventListener('click',e=>{if(e.target===modalBackdrop)closeModal()});
document.getElementById('approveBtn').addEventListener('click',()=>{if(!activePost)return;activePost.status='Approved';showToast('Post approved');render();openModal(activePost)});
document.getElementById('googleEventBtn').addEventListener('click',()=>{if(activePost)window.open(buildGoogleEventUrl(activePost),'_blank')});
document.getElementById('prevMonth').addEventListener('click',()=>{currentMonth--;if(currentMonth<0){currentMonth=11;currentYear--}render()});
document.getElementById('nextMonth').addEventListener('click',()=>{currentMonth++;if(currentMonth>11){currentMonth=0;currentYear++}render()});
document.getElementById('todayBtn').addEventListener('click',()=>{currentYear=2026;currentMonth=5;render()});

document.getElementById('connectBtn').addEventListener('click',()=>{
  document.getElementById('calendarStatus').textContent='Connection demo';
  document.getElementById('sidebarStatus').textContent='Connection demo enabled';
  showToast('This test shows the connection flow. Real sync needs Google sign-in and Calendar API setup.');
});

document.getElementById('exportBtn').addEventListener('click',exportICS);document.getElementById('exportBtn2').addEventListener('click',exportICS);
document.getElementById('openGoogleBtn').addEventListener('click',()=>window.open('https://calendar.google.com','_blank'));

function exportICS(){
  const visible=posts.filter(p=>{const d=new Date(`${p.date}T12:00:00`);return d.getFullYear()===currentYear&&d.getMonth()===currentMonth});
  const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//PicPlanr//Content Calendar//EN','CALSCALE:GREGORIAN'];
  visible.forEach(post=>{
    const start=toICSDate(post.date,post.time);const end=toICSDate(post.date,addMinutes(post.time,30));
    body.push('BEGIN:VEVENT',`UID:picplanr-${post.id}-${post.date}@picplanr`,`DTSTAMP:${toICSDate('2026-06-19','12:00')}`,`DTSTART:${start}`,`DTEND:${end}`,`SUMMARY:${escapeICS(`${post.platform}: ${post.title}`)}`,`DESCRIPTION:${escapeICS(`${post.caption}\n\nWhy this time: ${post.reason}`)}`,'END:VEVENT');
  });
  body.push('END:VCALENDAR');
  const blob=new Blob([body.join('\r\n')],{type:'text/calendar;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`PicPlanr-${monthNames[currentMonth]}-${currentYear}.ics`;a.click();URL.revokeObjectURL(url);showToast('Calendar file downloaded');
}

function buildGoogleEventUrl(post){
  const start=googleDate(post.date,post.time),end=googleDate(post.date,addMinutes(post.time,30));
  const params=new URLSearchParams({action:'TEMPLATE',text:`${post.platform}: ${post.title}`,dates:`${start}/${end}`,details:`${post.caption}\n\nWhy this time: ${post.reason}`});return `https://calendar.google.com/calendar/render?${params}`;
}
function formatTime(t){const [h,m]=t.split(':').map(Number);const suffix=h>=12?'pm':'am';const hour=h%12||12;return `${hour}:${String(m).padStart(2,'0')}${suffix}`}
function formatDate(d){return new Date(`${d}T12:00:00`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function addMinutes(t,mins){let [h,m]=t.split(':').map(Number);m+=mins;h=(h+Math.floor(m/60))%24;m%=60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`}
function toICSDate(date,time){return `${date.replaceAll('-','')}T${time.replace(':','')}00`}
function googleDate(date,time){return `${date.replaceAll('-','')}T${time.replace(':','')}00`}
function escapeICS(s){return s.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;')}
function showToast(message){const t=document.getElementById('toast');t.textContent=message;t.classList.remove('hidden');setTimeout(()=>t.classList.add('hidden'),3200)}
render();
