const $=id=>document.getElementById(id);
function cleanCaptionText(text){
  return String(text||'')
    .replace(/[—–]/g,', ')
    .replace(/\s+-\s+/g,', ')
    .replace(/\bcolor\b/gi,'colour')
    .replace(/\bcolors\b/gi,'colours')
    .replace(/\borganize\b/gi,'organise')
    .replace(/\borganized\b/gi,'organised')
    .replace(/\borganizing\b/gi,'organising')
    .replace(/\bpersonalize\b/gi,'personalise')
    .replace(/\bpersonalized\b/gi,'personalised')
    .replace(/\bcenter\b/gi,'centre')
    .replace(/\bcenters\b/gi,'centres')
    .replace(/\bfavorite\b/gi,'favourite')
    .replace(/\bfavorites\b/gi,'favourites')
    .replace(/\bbehavior\b/gi,'behaviour')
    .replace(/\bbehaviors\b/gi,'behaviours')
    .replace(/\blicense\b/gi,'licence')
    .replace(/\bprogram\b/gi,'programme')
    .replace(/\bgray\b/gi,'grey')
    .replace(/\btraveler\b/gi,'traveller')
    .replace(/\btraveling\b/gi,'travelling')
    .replace(/\s{2,}/g,' ')
    .replace(/\s+,/g,',')
    .trim();
}
function cleanCaptionObject(caption){
  return {...caption,text:cleanCaptionText(caption?.text||'')};
}

function showLoading(title,message,button){
  if($('loadingOverlay')){
    $('loadingTitle').textContent=title||'Working on it…';
    $('loadingMessage').textContent=message||'PicPlanr is processing your request.';
    $('loadingOverlay').classList.remove('hidden');
  }
  if(button){
    button.dataset.loadingText=button.textContent;
    button.classList.add('is-loading');
    button.disabled=true;
  }
}
function hideLoading(button){
  if($('loadingOverlay'))$('loadingOverlay').classList.add('hidden');
  if(button){
    button.classList.remove('is-loading');
    button.disabled=false;
    if(button.dataset.loadingText){
      button.textContent=button.dataset.loadingText;
      delete button.dataset.loadingText;
    }
  }
}
const state={accountType:'Business',profile:null,files:[],images:[],groups:[],approved:new Set(),storyIdeas:[],approvedStories:new Set()};
const titles={onboarding:'Account setup',connections:'Connected accounts',audit:'Account review',upload:'Upload folder',posts:'Content ideas',calendar:'Smart calendar'};
function show(step){document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));$(step).classList.add('active');document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.step===step));$('title').textContent=titles[step]}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>show(b.dataset.step));document.querySelectorAll('.account-choice').forEach(b=>b.onclick=()=>{state.accountType=b.dataset.type;document.querySelectorAll('.account-choice').forEach(x=>x.classList.toggle('selected',x===b));$('goal').innerHTML=state.accountType==='Business'?'<option>Increase enquiries</option><option>Build trust</option><option>Increase sales</option><option>Promote partnerships</option>':'<option>Grow engagement</option><option>Grow followers</option><option>Build a personal brand</option><option>Secure brand partnerships</option><option>Share consistently</option>'});
function context(){return{accountType:state.accountType,name:$('accountName').value.trim(),industry:$('industry').value.trim(),platform:$('platform').value,goal:$('goal').value,instagram:$('instagram').value.trim(),linkedin:$('linkedin').value.trim(),tiktok:$('tiktok').value.trim(),website:$('website').value.trim(),competitors:$('competitors').value.trim()}}
function normaliseHandle(value){
  const handle=String(value||'').trim();
  if(!handle)return '@yourhandle';
  return handle.startsWith('@')?handle:`@${handle}`;
}
function domainLabel(value){
  try{
    const text=String(value||'').trim();
    if(!text)return 'yourwebsite.com';
    const url=text.startsWith('http')?new URL(text):new URL(`https://${text}`);
    return url.hostname.replace(/^www\./,'');
  }catch{
    return 'yourwebsite.com';
  }
}
function buildProfileBio(ctx){
  const parts=[];
  if(ctx.industry)parts.push(ctx.industry);
  if(ctx.goal)parts.push(ctx.goal);
  if(!parts.length)return 'Your account description will appear here.';
  return parts.join('. ') + '.';
}
function renderProfileReference(){
  const ctx=context();
  const instagramHandle=ctx.instagram||'';
  const tiktokHandle=ctx.tiktok||'';
  const website=ctx.website||'';
  const accountName=ctx.name||'Your account name';
  const category=ctx.industry||'';
  const goal=ctx.goal||'';

  const baseBio=category
    ? `${category}${goal?`. ${goal}.`:'.'}`
    : 'Add an industry or category to create a basic preview.';

  if($('instagramPreviewName'))$('instagramPreviewName').textContent=accountName;
  if($('instagramPreviewHandle'))$('instagramPreviewHandle').textContent=normaliseHandle(instagramHandle);
  if($('instagramPreviewBio'))$('instagramPreviewBio').textContent=baseBio;
  if($('instagramPreviewWebsite'))$('instagramPreviewWebsite').textContent=domainLabel(website);

  if($('tiktokPreviewName'))$('tiktokPreviewName').textContent=accountName;
  if($('tiktokPreviewHandle'))$('tiktokPreviewHandle').textContent=normaliseHandle(tiktokHandle);
  if($('tiktokPreviewBio'))$('tiktokPreviewBio').textContent=baseBio;
  if($('tiktokPreviewWebsite'))$('tiktokPreviewWebsite').textContent=domainLabel(website);

  const instagramImages=state.images.filter(image=>image.localImage).slice(0,6);
  document.querySelectorAll('#instagramGridPreview > div').forEach((tile,index)=>{
    const image=instagramImages[index];
    if(image){
      tile.style.backgroundImage=`url("${image.localImage}")`;
      tile.innerHTML='';
    }else{
      tile.style.backgroundImage='';
      tile.innerHTML='<span>Connect Instagram</span>';
    }
  });

  const tiktokVideos=state.previews
    .filter(item=>item&&item.type==='video')
    .slice(0,6);
  document.querySelectorAll('#tiktokGridPreview > div').forEach((tile,index)=>{
    const video=tiktokVideos[index];
    if(video){
      tile.style.backgroundImage='linear-gradient(135deg,#202027,#34343a)';
      tile.innerHTML=`<span>${esc(video.name||'Video')}</span>`;
    }else{
      tile.style.backgroundImage='';
      tile.innerHTML='<span>Connect TikTok</span>';
    }
  });

  const hasInstagram=Boolean(instagramHandle);
  const hasTikTok=Boolean(tiktokHandle);

  if($('instagramPreviewTab'))$('instagramPreviewTab').classList.toggle('hidden',!hasInstagram&&hasTikTok);
  if($('tiktokPreviewTab'))$('tiktokPreviewTab').classList.toggle('hidden',!hasTikTok&&hasInstagram);

  if(hasTikTok&&!hasInstagram){
    activateSocialPreview('tiktok');
  }else{
    activateSocialPreview('instagram');
  }

  if($('previewConnectionHeading')){
    $('previewConnectionHeading').textContent=
      hasInstagram||hasTikTok?'Supplied account preview':'No social handle supplied';
  }
  if($('previewConnectionMessage')){
    $('previewConnectionMessage').textContent=
      hasInstagram||hasTikTok
        ?'The handle is shown, but the profile data remains unavailable until connection.'
        :'Add an Instagram or TikTok handle during onboarding to create a preview.';
  }
}

function activateSocialPreview(platform){
  document.querySelectorAll('.social-preview-tab').forEach(tab=>{
    tab.classList.toggle('active',tab.dataset.preview===platform);
  });
  document.querySelectorAll('.social-preview-panel').forEach(panel=>{
    panel.classList.toggle('active',panel.id===`${platform}PreviewPanel`);
  });
}
async function api(action,payload){const r=await fetch('/api/picplanr',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...payload})});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Something went wrong.');return b}
$('buildProfile').onclick=async()=>{const btn=$('buildProfile');const ctx=context();const missing=[];if(!ctx.name)missing.push('name');if(!ctx.industry)missing.push('industry or content category');if(!ctx.instagram&&!ctx.linkedin&&!ctx.tiktok&&!ctx.website)missing.push('a social handle or website');if(missing.length){alert(`Please add ${missing.join(', ')} before PicPlanr analyses the account.`);return}showLoading('Analysing your account','PicPlanr is using only the details you supplied. Live social data will be added after account connection.',btn);try{state.profile=(await api('profile',{context:ctx})).profile;renderProfile();renderProfileReference();$('statusPill').textContent='Initial profile ready';}catch(e){alert(e.message)}finally{hideLoading(btn)}};
function renderProfile(){const p=state.profile;$('profileResult').classList.remove('hidden');$('profileResult').innerHTML=`<h3>Your ${state.accountType==='Business'?'brand':'personal'} voice</h3><p>${esc(p.summary)}</p><div class="tags">${(p.voice_traits||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div><p><strong>Content direction:</strong> ${esc(p.content_direction)}</p><p><strong>How PicPlanr should write:</strong> ${esc(p.writing_rules)}</p>${p.confidence_note?`<p class="confidence-note"><strong>Information limits:</strong> ${esc(p.confidence_note)}</p>`:''}`}
$('runAudit').onclick=async()=>{const btn=$('runAudit');showLoading('Reviewing your account','PicPlanr is checking profile strength, positioning and recommended improvements.',btn);try{const data=await api('audit',{context:context(),profile:state.profile});const a=data.audit;$('auditResult').className='audit-grid';$('auditResult').innerHTML=`<div class="audit-box"><h3>Strong foundations</h3><ul>${a.strengths.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="audit-box"><h3>Improve next</h3><ul>${a.improvements.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><div class="audit-box"><h3>Recommended actions</h3><ul>${a.actions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`}catch(e){alert(e.message)}finally{hideLoading(btn)}};
$('chooseFolder').onclick=()=>$('folderInput').click();$('chooseFiles').onclick=e=>{e.stopPropagation();$('fileInput').click()};$('drop').onclick=()=>$('fileInput').click();$('folderInput').onchange=e=>loadFiles(e.target.files);$('fileInput').onchange=e=>loadFiles(e.target.files);$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();loadFiles(e.dataTransfer.files)};
function loadFiles(list){state.files=Array.from(list).filter(f=>f.type.startsWith('image/')).slice(0,50);$('previewGrid').innerHTML='';state.files.forEach(f=>{const u=URL.createObjectURL(f),d=document.createElement('div');d.className='preview';d.innerHTML=`<img src="${u}"><span>${esc(f.name)}</span>`;$('previewGrid').appendChild(d)});$('analyseFolder').classList.toggle('hidden',!state.files.length);$('statusPill').textContent=`${state.files.length} images selected`}
async function compress(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{const originalWidth=img.width,originalHeight=img.height,orientation=originalHeight>originalWidth?'portrait':originalWidth>originalHeight?'landscape':'square';const max=1400,s=Math.min(1,max/Math.max(originalWidth,originalHeight)),c=document.createElement('canvas');c.width=Math.round(originalWidth*s);c.height=Math.round(originalHeight*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve({dataUrl:c.toDataURL('image/jpeg',.72),width:originalWidth,height:originalHeight,orientation})};img.onerror=reject;img.src=url})}
$('analyseFolder').onclick=async()=>{if(!state.profile){alert('Please create the account voice profile first.');show('onboarding');return}const total=state.files.length;$('progressWrap').classList.remove('hidden');state.images=[];state.storyIdeas=[];state.approvedStories.clear();try{for(let i=0;i<total;i++){$('progressText').textContent=`Analysing ${state.files[i].name}`;$('progressCount').textContent=`${i+1} / ${total}`;$('progressBar').style.width=`${Math.round(i/total*100)}%`;const compressed=await compress(state.files[i]);const out=await api('image',{context:context(),profile:state.profile,image:{name:state.files[i].name,dataUrl:compressed.dataUrl}});state.images.push({...out.analysis,image_id:`img-${i}`,localImage:compressed.dataUrl,filename:state.files[i].name,index:i,width:compressed.width,height:compressed.height,orientation:compressed.orientation})}$('progressText').textContent='Grouping related images…';
const grouped=await api('group',{
  context:context(),
  profile:state.profile,
  images:state.images.map(({localImage,...x})=>x)
});
if(!grouped||!Array.isArray(grouped.groups)){
  throw new Error('PicPlanr could not create content ideas from this upload. Please try again.');
}

const draftGroups=grouped.groups.map(g=>{
  const ids=Array.isArray(g.image_ids)?g.image_ids:[];
  return{
    ...g,
    image_ids:ids,
    images:ids.map(id=>state.images.find(image=>image.image_id===id)).filter(Boolean),
    selected:0
  };
}).filter(g=>g.images.length);

$('progressText').textContent='Accuracy-checking every content idea…';
state.groups=[];
for(let groupIndex=0;groupIndex<draftGroups.length;groupIndex++){
  const draft=draftGroups[groupIndex];
  $('progressCount').textContent=`${groupIndex+1} / ${draftGroups.length}`;
  const validation=await api('validate',{
    context:context(),
    profile:state.profile,
    group:{
      title:draft.title,
      image_ids:draft.image_ids,
      format:draft.format,
      objective:draft.objective,
      group_reason:draft.group_reason,
      schedule:draft.schedule,
      captions:draft.captions
    },
    images:draft.images.map(image=>({
      image_id:image.image_id,
      dataUrl:image.localImage,
      analysis:{
        literal_summary:image.literal_summary,
        confirmed_subjects:image.confirmed_subjects,
        confirmed_setting:image.confirmed_setting,
        confirmed_actions:image.confirmed_actions,
        readable_text:image.readable_text,
        prohibited_inferences:image.prohibited_inferences,
        overall_confidence:image.overall_confidence
      }
    }))
  });

  if(validation&&validation.group&&validation.group.approved_for_display!==false){
    const fixed=validation.group;
    state.groups.push({
      ...draft,
      ...fixed,
      image_ids:draft.image_ids,
      images:draft.images,
      captions:Array.isArray(fixed.captions)?fixed.captions.map(cleanCaptionObject):[],
      schedule:fixed.schedule||draft.schedule||{day:'Tuesday',time:'6:00 PM',reason:'Balanced content timing'},
      selected:0,
      accuracy_status:fixed.accuracy_status||'checked',
      accuracy_notes:Array.isArray(fixed.accuracy_notes)?fixed.accuracy_notes:[]
    });
  }
}
if(!state.groups.length){
  throw new Error('PicPlanr could not create any sufficiently accurate ideas from these images. Try a smaller or clearer selection.');
}

const portraitAnalyses=state.images
  .filter(image=>image.orientation==='portrait')
  .map(({localImage,...image})=>image);

state.storyIdeas=[];
if(portraitAnalyses.length){
  try{
    $('progressText').textContent='Creating Story updates from portrait images…';
    const storyResponse=await api('stories',{
      context:context(),
      profile:state.profile,
      images:portraitAnalyses
    });
    if(storyResponse&&Array.isArray(storyResponse.stories)){
      state.storyIdeas=storyResponse.stories.map((story,index)=>{
        const sourceImage=state.images.find(image=>image.index===story.image_index);
        return{
          ...story,
          id:`story-ai-${index}-${story.image_index}`,
          image:sourceImage?.localImage||'',
          captions:Array.isArray(story.text_options)?story.text_options.map(cleanCaptionObject):[],
          selected:0
        };
      }).filter(story=>story.image&&story.captions.length===3);
    }
  }catch(storyError){
    console.warn('Story generation used fallback:',storyError);
  }
}

$('progressBar').style.width='100%';
renderGroups();
show('posts');
$('statusPill').textContent=`${state.groups.length} content ideas created`;
}catch(e){alert(e.message)}};
function renderGroups(){
  if(!state.groups.length)return;

  $('ideasOverview').classList.remove('hidden');
  $('storyIdeasPanel').classList.remove('hidden');
  renderIdeasOverview();
  renderStoryIdeas();

  $('groups').className='';
  $('groups').innerHTML=state.groups.map((g,gi)=>`
    <article class="group-card">
      <div class="group-top">
        <div class="collage">${g.images.slice(0,4).map(i=>`<img src="${i.localImage}">`).join('')}</div>
        <div>
          <div class="group-meta">
            <span class="tag">${esc(g.format)}</span>
            <span class="tag">${g.images.length} image${g.images.length===1?'':'s'}</span>
            <span class="tag">${esc(g.objective)}</span>
          </div>
          <h2>${esc(g.title)}</h2>
          <div class="accuracy-row">
            <span class="accuracy-badge ${g.accuracy_status==='review'?'review':''}">
              ${g.accuracy_status==='review'?'Needs careful review':'✓ Accuracy checked'}
            </span>
          </div>
          <p>${esc(g.group_reason)}</p>
          ${(g.accuracy_notes||[]).length?`<div class="accuracy-warning">${esc(g.accuracy_notes.join(' · '))}</div>`:''}
          <div class="reason"><strong>Recommended time:</strong> ${esc(g.schedule.day)} at ${esc(g.schedule.time)} — ${esc(g.schedule.reason)}</div>
        </div>
      </div>
      <div class="caption-options">
        ${g.captions.map((c,ci)=>`
          <div class="caption-option ${ci===g.selected?'selected':''}" data-g="${gi}" data-c="${ci}">
            <strong>${esc(c.label)}</strong>
            <p>${esc(c.text)}</p>
          </div>`).join('')}
      </div>
      <button class="primary approve-group" data-g="${gi}">
        ${state.approved.has(gi)?'Approved':'Approve selected caption'}
      </button>
    </article>`).join('');

  document.querySelectorAll('.caption-option').forEach(x=>x.onclick=()=>{
    state.groups[+x.dataset.g].selected=+x.dataset.c;
    renderGroups();
  });
  document.querySelectorAll('.approve-group').forEach(x=>x.onclick=()=>{
    state.approved.add(+x.dataset.g);
    renderGroups();
  });
}

function normaliseIdeaType(format){
  const value=String(format||'').toLowerCase();
  if(value.includes('story'))return 'story';
  if(value.includes('reel')||value.includes('video'))return 'reel';
  if(value.includes('carousel'))return 'carousel';
  return 'post';
}

function renderIdeasOverview(){
  const items=[];
  state.groups.forEach((g,index)=>{
    items.push({
      order:index+1,
      type:normaliseIdeaType(g.format),
      label:g.format||'Post',
      time:`Best: ${g.schedule?.time||'Recommended time'}`,
      topic:g.title
    });
    (g.story_ideas||[]).slice(0,1).forEach(story=>{
      items.push({
        order:items.length+1,
        type:'story',
        label:'Story',
        time:`Best: ${story.best_time||g.schedule?.time||'Flexible'}`,
        topic:story.title||'Supporting Story'
      });
    });
  });

  const limited=items.slice(0,31);
  $('ideasSummary').textContent=
    `${state.groups.length} main ideas with ${items.filter(i=>i.type==='story').length} supporting Story suggestions.`;

  $('ideasGrid').innerHTML=limited.map(item=>`
    <article class="idea-card ${item.type}">
      <span class="idea-order">${item.order}</span>
      <strong class="idea-type">${esc(item.label)}</strong>
      <span class="idea-time">${esc(item.time)}</span>
      <span class="idea-topic">${esc(item.topic)}</span>
    </article>`).join('');
}

function storyCaptionOptions(title,purpose,accountName){
  const name=accountName||'';
  const subject=String(title||'today').replace(/^Behind the scenes:\s*/i,'').replace(/^Audience question:\s*/i,'');
  return [
    {
      label:'Quick update',
      text:cleanCaptionText(`A little update from ${name||'us'}, ${subject}.`)
    },
    {
      label:'Engagement',
      text:cleanCaptionText(`What do you think of ${subject.toLowerCase()}?`)
    },
    {
      label:'Call to action',
      text:cleanCaptionText(purpose==='Encourage replies'
        ?`Reply and tell ${name?'us':'me'} what you think.`
        :`Message ${name?'us':'me'} to find out more.`)
    }
  ];
}

function fallbackStoryIdeas(){
  const ideas=[];
  const portraitImages=state.images.filter(image=>image.orientation==='portrait');
  const account=context();
  const accountName=account.name||'';

  portraitImages.forEach((image,index)=>{
    const relatedGroup=state.groups.find(group=>
      (group.images||[]).some(groupImage=>groupImage.index===image.index)
    );
    const subject=relatedGroup?.title||image.subject||image.primary_subject||image.content_category||'today’s update';
    const time=relatedGroup?.schedule?.time||'Flexible';

    ideas.push({
      id:`story-${image.index}-update`,
      image_index:image.index,
      title:`Quick update: ${subject}`,
      best_time:time,
      purpose:'Keep customers up to date',
      description:`Use this Story as a short, current update rather than a full post.`,
      frames:[
        `Short opening: “A quick update from ${accountName||'us'}”`,
        `Add one clear phrase about ${subject.toLowerCase()}`,
        'Finish with a reply prompt or next step'
      ],
      image:image.localImage,
      captions:storyCaptionOptions(subject,'Keep customers up to date',accountName),
      selected:0
    });

    ideas.push({
      id:`story-${image.index}-engage`,
      image_index:image.index,
      title:`Customer check-in: ${subject}`,
      best_time:time,
      purpose:'Encourage replies',
      description:'Use a short question to keep the audience involved in what is happening.',
      frames:[
        `Show the portrait image with a short heading`,
        `Ask one question related to ${subject.toLowerCase()}`,
        'Invite a reply, reaction or message'
      ],
      image:image.localImage,
      captions:storyCaptionOptions(subject,'Encourage replies',accountName),
      selected:0
    });
  });

  return ideas.slice(0,8);
}

function ensureStoryIdeas(){
  if(!state.storyIdeas.length){
    state.storyIdeas=fallbackStoryIdeas();
  }
}

function renderStoryIdeas(){
  ensureStoryIdeas();
  const ideas=state.storyIdeas.slice(0,9);

  $('storyCount').textContent=`${ideas.length} idea${ideas.length===1?'':'s'}`;
  if(!ideas.length){
    $('storyIdeas').innerHTML=`<div class="portrait-story-empty"><strong>No portrait images found</strong><span>Upload at least one vertical image to receive Story ideas. Landscape and square images will stay available for posts and carousels.</span></div>`;
    return;
  }
  $('storyIdeas').innerHTML=ideas.map((idea,index)=>`
    <article class="story-review-card">
      <div class="story-review-top">
        ${idea.image?`<img class="story-review-image" src="${idea.image}" alt="">`:''}
        <div class="story-review-copy">
          <div class="story-idea-meta">
            <span class="story-chip">Story ${index+1}</span>
            <span class="story-chip">${esc(idea.best_time||'Flexible')}</span>
            <span class="story-chip">${esc(idea.purpose||'Engagement')}</span>
          </div>
          <h4>${esc(idea.title||'Story idea')}</h4>
          <p class="story-purpose-copy">${esc(idea.description||'Use this as a short Story update for your audience.')}</p>
          <ol class="story-frames">
            ${(idea.frames||[]).slice(0,4).map(frame=>`<li>${esc(frame)}</li>`).join('')}
          </ol>
        </div>
      </div>

      <div class="caption-options story-caption-options">
        ${(idea.captions||[]).map((caption,captionIndex)=>`
          <div class="caption-option story-caption-option ${captionIndex===idea.selected?'selected':''}"
               data-story="${index}" data-story-caption="${captionIndex}">
            <strong>${esc(caption.label)}</strong>
            <p>${esc(caption.text)}</p>
          </div>`).join('')}
      </div>

      <button class="primary approve-story" data-story="${index}">
        ${state.approvedStories.has(idea.id)?'Approved for scheduling':'Approve Story update'}
      </button>
    </article>`).join('');

  document.querySelectorAll('.story-caption-option').forEach(option=>option.onclick=()=>{
    const storyIndex=+option.dataset.story;
    const captionIndex=+option.dataset.storyCaption;
    state.storyIdeas[storyIndex].selected=captionIndex;
    renderStoryIdeas();
  });

  document.querySelectorAll('.approve-story').forEach(button=>button.onclick=()=>{
    const storyIndex=+button.dataset.story;
    const idea=state.storyIdeas[storyIndex];
    state.approvedStories.add(idea.id);
    renderStoryIdeas();
  });
}

$('approveAll').onclick=()=>{state.groups.forEach((_,i)=>state.approved.add(i));ensureStoryIdeas();state.storyIdeas.forEach(x=>state.approvedStories.add(x.id));renderGroups()};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}


let calendarDate=new Date();calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth(),1);let scheduledPosts=[];let activePost=null;let scheduleWindowStart=null;let scheduleWindowEnd=null;
const dayMap={Sunday:0,Monday:1,Tuesday:2,Wednesday:3,Thursday:4,Friday:5,Saturday:6};

function parseTime(text){
  const m=String(text||'10:00 AM').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if(!m)return{h:10,m:0};
  let h=+m[1],min=+m[2],ap=(m[3]||'').toUpperCase();
  if(ap==='PM'&&h<12)h+=12;
  if(ap==='AM'&&h===12)h=0;
  return{h,m:min}
}
function addDays(date,days){
  const d=new Date(date);d.setDate(d.getDate()+days);return d;
}
function cleanDate(date){
  const d=new Date(date);d.setHours(0,0,0,0);return d;
}
function schedulingWeeks(start,end){
  const weeks=[];
  let cursor=startOfWeek(start);
  while(cursor<=end){
    const weekStart=new Date(cursor);
    const weekEnd=addDays(weekStart,6);weekEnd.setHours(23,59,59,999);
    weeks.push({start:weekStart,end:weekEnd,count:0});
    cursor=addDays(cursor,7);
  }
  return weeks;
}
function dateForPreferredDay(week,dayName,usedDates,startLimit,endLimit){
  const mondayIndex={Monday:0,Tuesday:1,Wednesday:2,Thursday:3,Friday:4,Saturday:5,Sunday:6};
  const preferred=mondayIndex[dayName]??2;
  const candidateOrder=[preferred,1,3,0,4,2,5,6];
  for(const offset of candidateOrder){
    const d=addDays(week.start,offset);
    if(d<startLimit||d>endLimit)continue;
    if(!usedDates.has(d.toDateString())){
      usedDates.add(d.toDateString());
      return d;
    }
  }
  for(let d=new Date(week.start);d<=week.end;d=addDays(d,1)){
    if(d<startLimit||d>endLimit)continue;
    if(!usedDates.has(d.toDateString())){
      usedDates.add(d.toDateString());
      return new Date(d);
    }
  }
  return null;
}
function buildScheduledPosts(){
  const approved=[...state.approved].map(i=>({group:state.groups[i],groupIndex:i}));
  if(!approved.length){alert('Approve at least one post group first.');return false}

  const now=new Date();
  scheduleWindowStart=cleanDate(now);
  scheduleWindowStart=addDays(scheduleWindowStart,1); // never schedule in the past
  scheduleWindowEnd=addDays(scheduleWindowStart,29);

  const weeks=schedulingWeeks(scheduleWindowStart,scheduleWindowEnd);
  const usedDates=new Set();
  const total=approved.length;

  // Aim for an even monthly plan. Seven posts becomes roughly two per week.
  const activeWeekCount=Math.min(4,weeks.length);
  const targetPerWeek=Math.min(4,Math.max(1,Math.ceil(total/activeWeekCount)));
  let weekCursor=0;

  scheduledPosts=approved.map(({group,groupIndex})=>{
    let selectedWeek=null;

    // First pass: keep each week close to the even target.
    for(let tries=0;tries<weeks.length;tries++){
      const candidate=weeks[(weekCursor+tries)%weeks.length];
      if(candidate.count<targetPerWeek && candidate.count<4){
        selectedWeek=candidate;
        weekCursor=(weekCursor+tries+1)%weeks.length;
        break;
      }
    }

    // Second pass: enforce only the hard maximum of four.
    if(!selectedWeek){
      selectedWeek=weeks
        .filter(w=>w.count<4)
        .sort((a,b)=>a.count-b.count)[0];
    }
    if(!selectedWeek)return null;

    const date=dateForPreferredDay(
      selectedWeek,
      group.schedule.day,
      usedDates,
      scheduleWindowStart,
      scheduleWindowEnd
    );
    if(!date)return null;

    selectedWeek.count++;
    const t=parseTime(group.schedule.time);
    date.setHours(t.h,t.m,0,0);
    const selected=group.captions[group.selected]||group.captions[0];

    return{
      id:`post-${groupIndex}`,
      groupIndex,
      title:group.title,
      format:group.format,
      objective:group.objective,
      reason:`Scheduled within the next 30 days and balanced across the month. ${group.schedule.reason}`,
      platform:context().platform,
      image:group.images[0]?.localImage||'',
      caption:selected?.text||'',
      date,
      publishStatus:'Draft'
    }
  }).filter(Boolean).sort((a,b)=>a.date-b.date);

  // Display the actual month containing the first scheduled post.
  if(scheduledPosts.length){
    calendarDate=new Date(
      scheduledPosts[0].date.getFullYear(),
      scheduledPosts[0].date.getMonth(),
      1
    );
  }

  const weeklyCounts={};
  scheduledPosts.forEach(p=>{
    const key=startOfWeek(p.date).toLocaleDateString('en-CA');
    weeklyCounts[key]=(weeklyCounts[key]||0)+1;
  });

  renderWeek();
  renderMonth();
  $('calendarReady').classList.remove('hidden');
  $('makeSchedule').textContent='Rebuild schedule';

  const startLabel=scheduleWindowStart.toLocaleDateString([], {day:'numeric',month:'short'});
  const endLabel=scheduleWindowEnd.toLocaleDateString([], {day:'numeric',month:'short',year:'numeric'});
  $('calendarSummary').textContent=
    `${scheduledPosts.length} approved posts scheduled from ${startLabel} to ${endLabel}. Maximum 4 posts per week.`;
  return true;
}
$('makeSchedule').onclick=async()=>{const btn=$('makeSchedule');showLoading('Building your schedule','PicPlanr is spreading approved content across the next 30 days.',btn);try{await new Promise(r=>setTimeout(r,350));buildScheduledPosts()}finally{hideLoading(btn)}};
$('prevMonth').onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()-1,1);renderMonth()};
$('nextMonth').onclick=()=>{calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+1,1);renderMonth()};

function startOfWeek(date){
  const d=new Date(date); const diff=(d.getDay()+6)%7;
  d.setDate(d.getDate()-diff); d.setHours(0,0,0,0); return d
}
function renderWeek(){
  const holder=$('weekSchedule');
  if(!scheduledPosts.length){holder.innerHTML='<div class="empty">Build your schedule to see this week.</div>';return}
  const base=scheduledPosts.length?startOfWeek(scheduledPosts[0].date):startOfWeek(new Date());
  const seven=[...Array(7)].map((_,i)=>{const d=new Date(base);d.setDate(base.getDate()+i);return d});
  $('weekRange').textContent=`${seven[0].toLocaleDateString([], {day:'numeric',month:'short'})} – ${seven[6].toLocaleDateString([], {day:'numeric',month:'short',year:'numeric'})} · ${scheduledPosts.filter(p=>p.date>=seven[0]&&p.date<=new Date(seven[6].getFullYear(),seven[6].getMonth(),seven[6].getDate(),23,59,59)).length} posts`;
  holder.innerHTML=seven.map(d=>{
    let posts=scheduledPosts.filter(p=>p.date.toDateString()===d.toDateString());
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
  if(!scheduledPosts.length){
    $('calendarSummary').textContent='Approve post groups, then build your schedule.';
  }else if(scheduleWindowStart&&scheduleWindowEnd){
    const startLabel=scheduleWindowStart.toLocaleDateString([], {day:'numeric',month:'short'});
    const endLabel=scheduleWindowEnd.toLocaleDateString([], {day:'numeric',month:'short',year:'numeric'});
    $('calendarSummary').textContent=`${scheduledPosts.length} approved posts scheduled from ${startLabel} to ${endLabel}. Maximum 4 posts per week.`;
  }
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
const connectionState={instagram:false,linkedin:false,tiktok:false,configured:false,testMode:true};
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
  const pairs=[['instagram',data.instagramConnected],['linkedin',data.linkedinConnected],['tiktok',data.tiktokConnected]];
  pairs.forEach(([name,connected])=>{
    const status=$(name+'Status'),btn=$('connect'+name[0].toUpperCase()+name.slice(1));
    if(status)status.textContent=connected?'Connected':'Not connected';
    const card=btn?.closest('.connection-card');
    card?.classList.toggle('connected',!!connected);
    if(btn)btn.textContent=connected?'Connected':'Connect '+(name==='instagram'?'Instagram':name==='linkedin'?'LinkedIn':'TikTok');
  });
  const count=[data.instagramConnected,data.linkedinConnected,data.tiktokConnected].filter(Boolean).length;
  if($('connectionSummary'))$('connectionSummary').textContent=count?`${count} account${count===1?'':'s'} connected`:'No accounts connected';
  const readiness={
    readyDatabase:data.databaseReady,
    readyStorage:data.storageReady,
    readyInstagram:data.instagramConfigured,
    readyLinkedIn:data.linkedinConfigured,
    readyTikTok:data.tiktokConfigured,
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
$('connectTikTok').onclick=()=>beginConnection('tiktok');

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
    post_format:p.format,
    media_type:(p.format==='video'||p.format==='reel'||String(p.platform).toLowerCase()==='tiktok')?'video':'image'
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
if($('savePublishingQueue'))$('savePublishingQueue').onclick=async()=>{const btn=$('savePublishingQueue');showLoading('Saving publishing queue','PicPlanr is preparing approved content for scheduled publishing.',btn);try{await savePublishingQueue()}finally{hideLoading(btn)}};

// Add publishing state to modal.
const originalOpenPost=openPost;
openPost=function(id){
  originalOpenPost(id);
  if(activePost&&$('modalPublishStatus'))$('modalPublishStatus').textContent=activePost.publishStatus||'Draft';
};
loadPublishingStatus();

if($('refreshProfilePreview'))$('refreshProfilePreview').onclick=renderProfileReference;

renderProfileReference();

if($('goToConnections'))$('goToConnections').onclick=()=>show('connections');

document.querySelectorAll('.social-preview-tab').forEach(tab=>{
  tab.addEventListener('click',()=>activateSocialPreview(tab.dataset.preview));
});
