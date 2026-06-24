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
function cleanCaptionObject(caption,index=0){
  const defaultLabels=['Natural','Engagement','Goal-led'];

  if(typeof caption==='string'){
    return {
      label:defaultLabels[index]||`Option ${index+1}`,
      text:cleanCaptionText(caption)
    };
  }

  const item=caption&&typeof caption==='object'?caption:{};
  const label=
    item.label||
    item.title||
    item.type||
    item.name||
    defaultLabels[index]||
    `Option ${index+1}`;

  const text=
    item.text||
    item.caption||
    item.copy||
    item.content||
    item.value||
    item.phrase||
    '';

  return {
    ...item,
    label:String(label),
    text:cleanCaptionText(text)
  };
}

function normaliseCaptions(captions,fallback=[]){
  const source=Array.isArray(captions)?captions:[];
  let cleaned=source
    .map((caption,index)=>cleanCaptionObject(caption,index))
    .filter(caption=>caption.text);

  if(cleaned.length!==3){
    cleaned=(Array.isArray(fallback)?fallback:[])
      .map((caption,index)=>cleanCaptionObject(caption,index))
      .filter(caption=>caption.text);
  }

  const labels=['Natural','Engagement','Goal-led'];
  cleaned=cleaned.slice(0,3).map((caption,index)=>({
    ...caption,
    label:labels[index]
  }));

  return cleaned.length===3?cleaned:[];
}

function buildSafeStoryFallback(primarySubject){
  const subject=String(primarySubject||'this moment').trim();
  const lower=subject.toLowerCase();

  return [
    {
      label:'Quick update',
      text:cleanCaptionText(`A quick look at ${lower}.`)
    },
    {
      label:'Engagement',
      text:cleanCaptionText(`What do you think of ${lower}?`)
    },
    {
      label:'Call to action',
      text:cleanCaptionText('Reply or react to this Story.')
    }
  ];
}

function normaliseStoryCaptions(captions,primarySubject){
  const source=Array.isArray(captions)?captions:[];
  const labelMap=['Quick update','Engagement','Call to action'];

  let cleaned=source.map((caption,index)=>{
    if(typeof caption==='string'){
      return {
        label:labelMap[index]||`Option ${index+1}`,
        text:cleanCaptionText(caption)
      };
    }

    const item=caption&&typeof caption==='object'?caption:{};
    const text=
      item.text||
      item.caption||
      item.copy||
      item.content||
      item.value||
      item.phrase||
      item.overlay_text||
      '';

    return {
      ...item,
      label:labelMap[index]||item.label||`Option ${index+1}`,
      text:cleanCaptionText(text)
    };
  }).filter(item=>item.text);

  if(cleaned.length!==3){
    cleaned=buildSafeStoryFallback(primarySubject);
  }

  return cleaned.slice(0,3).map((item,index)=>({
    ...item,
    label:labelMap[index]
  }));
}

function mainSubjectFromImage(image){
  const firstSubject=Array.isArray(image.confirmed_subjects)&&image.confirmed_subjects[0]
    ? image.confirmed_subjects[0].name
    : '';
  return firstSubject||image.literal_summary||'this image';
}


function conciseSubject(image){
  const subjects=Array.isArray(image.confirmed_subjects)?image.confirmed_subjects:[];
  const named=subjects.find(item=>item&&item.name)?.name||'';
  return String(named||'').trim();
}

function safeNaturalFallbackCaptions(image){
  const subject=conciseSubject(image).toLowerCase();
  const ctx=context();
  const goal=String(ctx.goal||'').toLowerCase();

  let natural='A little moment worth sharing.';
  let engagement='What catches your eye first?';
  let goalLed='Follow along for more updates.';

  if(subject.includes('dog')){
    natural='Dressed for the occasion.';
    engagement='Who else loves a well dressed guest?';
    goalLed='Follow for more moments like this.';
  }else if(subject.includes('sign')){
    natural='A small detail that makes a big impression.';
    engagement='What message would you put on the screen?';
    goalLed='Planning something special? Get in touch.';
  }else if(subject.includes('person')||subject.includes('woman')||subject.includes('man')){
    natural='One for the memories.';
    engagement='What would your perfect celebration look like?';
    goalLed='Planning a celebration? Send us a message.';
  }else if(subject.includes('room')||subject.includes('venue')||subject.includes('interior')||subject.includes('space')){
    natural='Ready for whatever comes next.';
    engagement='How would you make this space your own?';
    goalLed='Looking for a flexible space? Get in touch.';
  }else if(subject.includes('arch')||subject.includes('entrance')){
    natural='It is all in the details.';
    engagement='Would this be your photo spot?';
    goalLed='Discover more of the space on our profile.';
  }else if(subject.includes('table')||subject.includes('dining')){
    natural='Set for a good time.';
    engagement='Who would you have around the table?';
    goalLed='Planning your next event? Enquire with us.';
  }else if(goal.includes('enquir')){
    goalLed='Like what you see? Send us a message.';
  }

  return [
    {label:'Natural',text:cleanCaptionText(natural)},
    {label:'Engagement',text:cleanCaptionText(engagement)},
    {label:'Goal-led',text:cleanCaptionText(goalLed)}
  ];
}

function buildLocalFallbackGroup(image){
  const subject=mainSubjectFromImage(image);
  const safeSubject=String(subject).replace(/[.!?]+$/,'').trim()||'this image';
  return {
    title:safeSubject.length>70?'Additional content idea':(
      safeSubject.toLowerCase().includes('dog')?'Dressed for the occasion':
      safeSubject.toLowerCase().includes('sign')?'A moment in the spotlight':
      safeSubject.toLowerCase().includes('venue')||safeSubject.toLowerCase().includes('space')?'Ready for your next event':
      safeSubject
    ),
    image_ids:[image.image_id],
    images:[image],
    format:'Single post',
    objective:'Create a useful social post from this image',
    group_reason:'This image works best as a standalone post with a simple, audience-focused caption.',
    schedule:{
      day:'Tuesday',
      time:'11:00',
      reason:'A balanced weekday slot for an additional content idea.'
    },
    captions:safeNaturalFallbackCaptions(image),
    selected:0,
    accuracy_status:'review',
    accuracy_notes:['Kept as a standalone post so it remains useful without forcing it into an unrelated carousel.']
  };
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
const state={accountType:'Business',profile:null,brandProfile:null,files:[],images:[],groups:[],approved:new Set(),storyIdeas:[],approvedStories:new Set(),profileScreenshots:{instagram:null,tiktok:null},audit:null};
const titles={onboarding:'Account setup',connections:'Connected accounts',audit:'Account review',upload:'Upload folder',posts:'Content ideas',calendar:'Smart calendar'};
function show(step){
  document.body.classList.toggle('account-review-open',step==='audit');
  document.querySelectorAll('.view').forEach(v=>{
    const active=v.id===step;
    v.classList.toggle('active',active);
    v.hidden=!active;
    v.style.setProperty('display',active?'block':'none','important');
    v.setAttribute('aria-hidden',active?'false':'true');
  });
  const auditResult=$('auditResult');
  if(auditResult){
    const onReview=step==='audit';
    auditResult.hidden=!onReview;
    auditResult.style.setProperty('display',onReview?(auditResult.classList.contains('account-strength-results')?'grid':'block'):'none','important');
  }
  document.querySelectorAll('.nav').forEach(b=>b.classList.toggle('active',b.dataset.step===step));
  $('title').textContent=titles[step];
  const pill=$('statusPill');
  if(pill){
    if(step==='audit' && pill.dataset.reviewScore) pill.textContent=pill.dataset.reviewScore;
    else if(step!=='audit' && pill.dataset.reviewScore) pill.textContent=state.brandProfile?'Brand profile ready':'Workspace ready';
  }
  window.scrollTo({top:0,behavior:'instant'});
}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>show(b.dataset.step));
show(document.querySelector('.nav.active')?.dataset.step||'onboarding');document.querySelectorAll('.account-choice').forEach(b=>b.onclick=()=>{state.accountType=b.dataset.type;document.querySelectorAll('.account-choice').forEach(x=>x.classList.toggle('selected',x===b));$('goal').innerHTML=state.accountType==='Business'?'<option>Increase enquiries</option><option>Build trust</option><option>Increase sales</option><option>Promote partnerships</option>':'<option>Grow engagement</option><option>Grow followers</option><option>Build a personal brand</option><option>Secure brand partnerships</option><option>Share consistently</option>'});
function context(){return{accountType:state.accountType,name:$('accountName').value.trim(),industry:$('industry').value.trim(),platform:$('platform').value,goal:$('goal').value,instagram:$('instagram').value.trim(),linkedin:$('linkedin').value.trim(),tiktok:$('tiktok').value.trim(),website:$('website').value.trim(),competitors:$('competitors').value.trim(),brandProfile:state.brandProfile}}
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
  if($('truthfulInstagramHandle'))$('truthfulInstagramHandle').textContent=ctx.instagram||'Not supplied';
  if($('truthfulTikTokHandle'))$('truthfulTikTokHandle').textContent=ctx.tiktok||'Not supplied';
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
async function websiteApi(payload){const r=await fetch('/api/website/analyse',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'We could not analyse this website.');return b}
function startBrandLoadingMessages(){
  const messages=[
    ['Reading your website','Finding the clearest information about your business.'],
    ['Understanding your services','Identifying what you offer and what makes it valuable.'],
    ['Identifying your audience','Learning who your content should speak to.'],
    ['Learning your brand style','Building a tone that feels natural and consistent.'],
    ['Creating your content strategy','Turning what we learned into practical content opportunities.']
  ];
  let index=0;
  if($('loadingTitle'))$('loadingTitle').textContent=messages[0][0];
  if($('loadingMessage'))$('loadingMessage').textContent=messages[0][1];
  return setInterval(()=>{index=(index+1)%messages.length;if($('loadingTitle'))$('loadingTitle').textContent=messages[index][0];if($('loadingMessage'))$('loadingMessage').textContent=messages[index][1];},1700);
}
function listText(value){return Array.isArray(value)?value.join('\n'):String(value||'')}
function listItems(value){return listText(value).split(/\n|,/).map(x=>x.trim()).filter(Boolean)}
function brandField(label,field,value,{list=false,wide=false}={}){
  const content=list?listText(value):String(value||'Not clear from the website');
  return `<article class="brand-profile-card ${wide?'wide-card':''}"><small>${esc(label)}</small><div class="brand-editable" data-brand-field="${esc(field)}" data-list="${list?'true':'false'}" contenteditable="false">${esc(content)}</div></article>`;
}
function profileFromBrand(brand){return{summary:brand.brand_summary||'',voice_traits:brand.brand_personality||[],content_direction:(brand.content_themes||[]).join(', '),writing_rules:brand.tone_of_voice||'',confidence_note:brand.confidence_note||'',brand_profile:brand}}
function collectEditedBrandProfile(){
  const brand={...(state.brandProfile||{})};
  document.querySelectorAll('[data-brand-field]').forEach(node=>{const field=node.dataset.brandField;brand[field]=node.dataset.list==='true'?listItems(node.innerText):node.innerText.trim()});
  return brand;
}
async function saveBrandProfile(){
  state.brandProfile=collectEditedBrandProfile();
  state.profile=profileFromBrand(state.brandProfile);
  localStorage.setItem('picplanrBrandProfile',JSON.stringify({accountType:state.accountType,brandProfile:state.brandProfile,profile:state.profile}));
  try{await fetch('/api/brand-profile/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accountType:state.accountType,profile:state.brandProfile})});}catch{}
}
function renderBrandProfile(){
  const b=state.brandProfile||{};
  $('profileResult').classList.remove('hidden');
  $('profileResult').innerHTML=`
    <div class="brand-profile-heading"><div><small>PICPLANR BRAND PROFILE</small><h3>We’ve built your brand profile</h3><p>Review what PicPlanr learned. You can edit anything before continuing.</p></div><span class="analysis-complete">Analysis complete</span></div>
    <div class="brand-profile-grid">
      ${brandField('Brand summary','brand_summary',b.brand_summary,{wide:true})}
      ${brandField('Industry','industry',b.industry)}
      ${brandField('Location','location',b.location)}
      ${brandField('Products or services','products_services',b.products_services,{list:true})}
      ${brandField('Target audience','target_audience',b.target_audience)}
      ${brandField('Brand personality','brand_personality',b.brand_personality,{list:true})}
      ${brandField('Tone of voice','tone_of_voice',b.tone_of_voice)}
      ${brandField('Key selling points','key_selling_points',b.key_selling_points,{list:true})}
      ${brandField('Content opportunities','content_themes',b.content_themes,{list:true})}
      ${brandField('Quick wins','quick_wins',b.quick_wins,{list:true,wide:true})}
    </div>
    ${b.confidence_note?`<p class="confidence-note"><strong>Analysis note:</strong> ${esc(b.confidence_note)}</p>`:''}
    <div class="brand-profile-actions"><button class="secondary" id="editBrandProfile" type="button">Edit brand profile</button><button class="primary" id="saveBrandProfile" type="button">Save and continue</button></div>
    <section id="brandReward" class="brand-reward hidden"><small>YOUR FIRST IDEAS</small><h3>Your brand profile is ready</h3><p>Here are three directions PicPlanr can turn into content immediately.</p><div class="reward-grid">${(b.content_themes||[]).slice(0,3).map((x,i)=>`<article><span>0${i+1}</span><strong>${esc(x)}</strong></article>`).join('')}</div><button class="primary" id="continueToUpload" type="button">Upload photos and create my first content plan</button></section>`;
  $('editBrandProfile').onclick=()=>{
    const editing=$('editBrandProfile').dataset.editing==='true';
    document.querySelectorAll('.brand-editable').forEach(node=>node.contentEditable=editing?'false':'true');
    $('editBrandProfile').dataset.editing=editing?'false':'true';
    $('editBrandProfile').textContent=editing?'Edit brand profile':'Finish editing';
    $('profileResult').classList.toggle('editing',!editing);
  };
  $('saveBrandProfile').onclick=async()=>{const btn=$('saveBrandProfile');showLoading('Saving your brand profile','PicPlanr will use this profile for image analysis, captions and content planning.',btn);try{await saveBrandProfile();$('brandReward').classList.remove('hidden');$('statusPill').textContent='Brand profile ready';$('brandReward').scrollIntoView({behavior:'smooth',block:'nearest'});}finally{hideLoading(btn)}};
  $('continueToUpload').onclick=()=>show('upload');
}
$('buildProfile').onclick=async()=>{
  const btn=$('buildProfile'),ctx=context();
  if(!ctx.website){alert('Add your website address, or choose “I do not have a website”.');return}
  showLoading('Reading your website','Finding the clearest information about your business.',btn);
  const timer=startBrandLoadingMessages();
  try{
    const data=await websiteApi({website:ctx.website,accountType:state.accountType,providedContext:ctx});
    state.brandProfile=data.brand_profile;
    state.profile=data.profile;
    if(!$('accountName').value.trim()&&state.brandProfile.business_name)$('accountName').value=state.brandProfile.business_name;
    if(!$('industry').value.trim()&&state.brandProfile.industry)$('industry').value=state.brandProfile.industry;
    renderBrandProfile();renderProfileReference();$('statusPill').textContent='Brand analysis ready';
  }catch(e){
    $('profileResult').classList.remove('hidden');
    $('profileResult').innerHTML=`<div class="analysis-error"><strong>We couldn’t read enough information from this website.</strong><span>${esc(e.message)}</span><div><button class="primary" id="retryWebsite" type="button">Try again</button><button class="secondary" id="manualWebsite" type="button">Enter details manually</button></div></div>`;
    $('retryWebsite').onclick=()=>$('buildProfile').click();
    $('manualWebsite').onclick=()=>$('skipWebsiteAnalysis').click();
  }finally{clearInterval(timer);hideLoading(btn)}
};
$('skipWebsiteAnalysis').onclick=async()=>{
  const btn=$('skipWebsiteAnalysis'),ctx=context(),missing=[];
  if(!ctx.name)missing.push('name');if(!ctx.industry)missing.push('industry or content category');
  if(missing.length){alert(`Please add ${missing.join(' and ')} so PicPlanr can build a manual profile.`);return}
  showLoading('Building your brand profile','Using the information you supplied to create a useful starting point.',btn);
  try{state.profile=(await api('profile',{context:ctx})).profile;state.brandProfile={business_name:ctx.name,brand_summary:state.profile.summary,industry:ctx.industry,location:'Not supplied',products_services:[],target_audience:'Not supplied',brand_personality:state.profile.voice_traits||[],tone_of_voice:state.profile.writing_rules||'',key_selling_points:[],content_themes:[state.profile.content_direction||'Brand introduction','Behind the scenes','Helpful advice','Customer proof','Updates and announcements'],quick_wins:['Connect a social account for a deeper review','Upload recent images to build your first plan','Review the profile and add any missing details'],recommended_platforms:[ctx.platform],social_links:{instagram:ctx.instagram,linkedin:ctx.linkedin,tiktok:ctx.tiktok},confidence_note:state.profile.confidence_note||'This profile is based only on the information supplied.',website:''};state.profile=profileFromBrand(state.brandProfile);renderBrandProfile();renderProfileReference();$('statusPill').textContent='Manual profile ready';}catch(e){alert(e.message)}finally{hideLoading(btn)}
};
function renderProfile(){if(state.brandProfile)return renderBrandProfile();const p=state.profile;$('profileResult').classList.remove('hidden');$('profileResult').innerHTML=`<h3>Your ${state.accountType==='Business'?'brand':'personal'} voice</h3><p>${esc(p.summary)}</p><div class="tags">${(p.voice_traits||[]).map(x=>`<span class="tag">${esc(x)}</span>`).join('')}</div><p><strong>Content direction:</strong> ${esc(p.content_direction)}</p><p><strong>How PicPlanr should write:</strong> ${esc(p.writing_rules)}</p>${p.confidence_note?`<p class="confidence-note"><strong>Information limits:</strong> ${esc(p.confidence_note)}</p>`:''}`}
function scoreTone(score){if(score>=80)return 'Excellent';if(score>=65)return 'Strong';if(score>=50)return 'Developing';return 'Needs attention'}
function renderAudit(a){
  state.audit=a;
  const auditView=$('audit'),auditResult=$('auditResult');
  if(auditView&&auditResult&&auditResult.parentElement!==auditView) auditView.appendChild(auditResult);
  const score=Math.max(0,Math.min(100,Number(a.overall_score)||0));
  const breakdown=Array.isArray(a.breakdown)?a.breakdown:[];
  const hasInstagramConnection=!!connectionState.instagram;
  const hasInstagramScreenshot=!!state.profileScreenshots.instagram;
  const isComplete=hasInstagramConnection;
  const isEnhanced=!isComplete&&hasInstagramScreenshot;
  const reviewLabel=isComplete?'CONNECTED INSTAGRAM DIAGNOSIS':isEnhanced?'SCREENSHOT-ASSISTED REVIEW':'PRELIMINARY PROFILE REVIEW';
  const basis=isComplete?'Connected Instagram account and available live data':isEnhanced?'Website, onboarding information and uploaded Instagram screenshot':'Website and onboarding information only';
  const confidence=isComplete?'Live account data':isEnhanced?'Improved evidence':'Limited evidence';
  const heading=isComplete?(a.score_label||scoreTone(score)):isEnhanced?'Provisional account score':'Preliminary profile score';
  const explanation=isComplete
    ?(a.hook_message||'PicPlanr has reviewed the connected Instagram account and identified the clearest opportunities.')
    :isEnhanced
      ?'This score uses the information supplied plus the uploaded Instagram screenshot. It is still provisional because performance statistics and complete account data are unavailable.'
      :'This is not a confirmed Instagram diagnosis. It is a cautious starting score based only on your website and onboarding answers; a typed Instagram handle cannot provide account data.';
  auditResult.className='account-strength-results';
  const reviewIsOpen=$('audit')?.classList.contains('active');
  auditResult.hidden=!reviewIsOpen;
  auditResult.style.setProperty('display',reviewIsOpen?'grid':'none','important');
  auditResult.innerHTML=`
    <section class="strength-hero ${isComplete?'live-review':'preliminary-review'}">
      <div class="score-ring" style="--score:${score}"><div><strong>${score}</strong><span>/100</span></div></div>
      <div class="strength-copy">
        <small>${reviewLabel}</small>
        <h3>${esc(heading)}</h3>
        <p>${esc(explanation)}</p>
        <div class="review-trust-note"><strong>${isComplete?'Verified review basis':'Important limitation'}</strong><span>${esc(basis)}</span></div>
        <div class="score-meta"><span>${esc(basis)}</span><span>${esc(confidence)}</span></div>
      </div>
      <div class="next-best-action"><small>BEST NEXT MOVE</small><strong>${esc(isComplete?(a.next_action||'Use the findings to improve the next content plan.'):isEnhanced?'Connect Instagram for a complete diagnosis with genuine account data.':'Connect Instagram or upload a current profile screenshot for a more useful review.')}</strong></div>
    </section>
    <section class="score-breakdown">
      ${breakdown.map(item=>{const v=Math.max(0,Math.min(100,Number(item.score)||0));return `<article class="score-factor"><div><strong>${esc(item.category||'Category')}</strong><span>${v}/100</span></div><div class="factor-track"><i style="width:${v}%"></i></div><p>${esc(item.reason||'')}</p></article>`}).join('')}
    </section>
    <section class="audit-grid">
      <div class="audit-box"><h3>Strong foundations</h3><ul>${(a.strengths||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="audit-box"><h3>Improve next</h3><ul>${(a.improvements||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="audit-box"><h3>Recommended actions</h3><ul>${(a.actions||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    </section>`;
}
$('runAudit').onclick=async()=>{const btn=$('runAudit');if(!state.profile){alert('Please analyse the account in Account setup first.');show('onboarding');return}const live=!!connectionState.instagram;showLoading(live?'Calculating connected Instagram strength':'Building a preliminary profile review',live?'PicPlanr is reviewing genuine connected account information and available performance data.':'PicPlanr is using your website, onboarding answers and any uploaded screenshots. A typed handle alone cannot provide Instagram data.',btn);try{const screenshots=Object.entries(state.profileScreenshots).filter(([,dataUrl])=>dataUrl).map(([platform,dataUrl])=>({platform,dataUrl}));const data=await api('audit',{context:context(),profile:state.profile,screenshots,review_mode:live?'connected_instagram':screenshots.some(x=>x.platform==='instagram')?'screenshot_assisted':'preliminary'});renderAudit(data.audit);$('statusPill').dataset.reviewScore=live?`Instagram diagnosis ${data.audit.overall_score}/100`:`Preliminary review ${data.audit.overall_score}/100`; $('statusPill').textContent=$('statusPill').dataset.reviewScore;}catch(e){alert(e.message)}finally{hideLoading(btn)}};
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
    captions:normaliseCaptions(g.captions),
    images:ids.map(id=>state.images.find(image=>image.image_id===id)).filter(Boolean),
    selected:0
  };
}).filter(g=>g.images.length&&g.captions.length===3);

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
      captions:normaliseCaptions(fixed.captions,draft.captions),
      schedule:fixed.schedule||draft.schedule||{day:'Tuesday',time:'6:00 PM',reason:'Balanced content timing'},
      selected:0,
      accuracy_status:fixed.accuracy_status||'checked',
      accuracy_notes:Array.isArray(fixed.accuracy_notes)?fixed.accuracy_notes:[]
    });
  }
}
// Make sure an image is never used twice across post ideas.
const alreadyUsed=new Set();
state.groups=state.groups.map(group=>{
  const uniqueImages=(group.images||[]).filter(image=>{
    if(alreadyUsed.has(image.image_id))return false;
    alreadyUsed.add(image.image_id);
    return true;
  });
  return{
    ...group,
    images:uniqueImages,
    image_ids:uniqueImages.map(image=>image.image_id)
  };
}).filter(group=>group.images.length);

// Recover every uploaded image that the first grouping pass did not use.
const unassignedImages=state.images.filter(image=>!alreadyUsed.has(image.image_id));
if(unassignedImages.length){
  $('progressText').textContent='Creating safe post ideas for remaining images…';
}

for(let recoveryIndex=0;recoveryIndex<unassignedImages.length;recoveryIndex++){
  const sourceImage=unassignedImages[recoveryIndex];
  $('progressCount').textContent=`${recoveryIndex+1} / ${unassignedImages.length}`;
  try{
    const recovered=await api('single_post',{
      context:context(),
      profile:state.profile,
      image:{
        image_id:sourceImage.image_id,
        dataUrl:sourceImage.localImage,
        analysis:{
          literal_summary:sourceImage.literal_summary,
          confirmed_subjects:sourceImage.confirmed_subjects,
          confirmed_setting:sourceImage.confirmed_setting,
          confirmed_actions:sourceImage.confirmed_actions,
          readable_text:sourceImage.readable_text,
          prohibited_inferences:sourceImage.prohibited_inferences,
          overall_confidence:sourceImage.overall_confidence
        }
      }
    });
    const recoveredGroup=recovered?.group;
    if(recoveredGroup){
      const captions=normaliseCaptions(recoveredGroup.captions);
      state.groups.push({
        ...recoveredGroup,
        image_ids:[sourceImage.image_id],
        images:[sourceImage],
        captions:captions.length===3?captions:buildLocalFallbackGroup(sourceImage).captions,
        selected:0,
        accuracy_status:recoveredGroup.accuracy_status||'checked',
        accuracy_notes:Array.isArray(recoveredGroup.accuracy_notes)?recoveredGroup.accuracy_notes:[]
      });
    }else{
      state.groups.push(buildLocalFallbackGroup(sourceImage));
    }
  }catch(recoveryError){
    console.warn('Used local fallback for unassigned image:',recoveryError);
    state.groups.push(buildLocalFallbackGroup(sourceImage));
  }
}

// Keep post ideas in the same order as the uploaded images.
state.groups.sort((a,b)=>{
  const ai=Math.min(...a.images.map(image=>image.index));
  const bi=Math.min(...b.images.map(image=>image.index));
  return ai-bi;
});

if(!state.groups.length){
  throw new Error('PicPlanr could not create content ideas from these images.');
}

const portraitImages=state.images.filter(image=>image.orientation==='portrait');

state.storyIdeas=[];
if(portraitImages.length){
  $('progressText').textContent='Creating accurate Story ideas from portrait images…';
  for(let storyIndex=0;storyIndex<Math.min(portraitImages.length,8);storyIndex++){
    const sourceImage=portraitImages[storyIndex];
    try{
      $('progressCount').textContent=`${storyIndex+1} / ${Math.min(portraitImages.length,8)}`;
      const storyResponse=await api('story_image',{
        context:context(),
        profile:state.profile,
        image:{
          image_id:sourceImage.image_id,
          image_index:sourceImage.index,
          dataUrl:sourceImage.localImage,
          analysis:{
            literal_summary:sourceImage.literal_summary,
            confirmed_subjects:sourceImage.confirmed_subjects,
            confirmed_setting:sourceImage.confirmed_setting,
            confirmed_actions:sourceImage.confirmed_actions,
            readable_text:sourceImage.readable_text,
            prohibited_inferences:sourceImage.prohibited_inferences,
            overall_confidence:sourceImage.overall_confidence
          }
        }
      });
      const story=storyResponse?.story;
      if(story){
        state.storyIdeas.push({
          ...story,
          id:`story-ai-${sourceImage.index}`,
          image:sourceImage.localImage,
          imageIndex:sourceImage.index,
          captions:normaliseStoryCaptions(story.text_options,story.primary_subject),
          selected:0,
          accuracyChecked:true
        });
      }
    }catch(storyError){
      console.warn('Story image skipped after accuracy check:',storyError);
    }
  }
}

$('progressBar').style.width='100%';
renderGroups();
show('posts');
$('statusPill').textContent=`${state.groups.length} content ideas created`;
}catch(e){alert(e.message)}};
function renderGroups(){
  if(!state.groups.length)return;
  state.groups=state.groups
    .map(group=>({...group,captions:normaliseCaptions(group.captions)}))
    .filter(group=>group.captions.length===3);

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
        ${normaliseCaptions(g.captions).map((c,ci)=>`
          <div class="caption-option ${ci===g.selected?'selected':''}" data-g="${gi}" data-c="${ci}">
            <div class="caption-option-header">
              <strong>${esc(c.label)}</strong>
              <button type="button" class="edit-caption-btn edit-post-caption" data-g="${gi}" data-c="${ci}">Edit</button>
            </div>
            <div class="caption-display">
              <p>${esc(c.text)}</p>
            </div>
            <div class="caption-editor hidden">
              <textarea class="caption-edit-area">${esc(c.text)}</textarea>
              <div class="caption-edit-actions">
                <button type="button" class="save-caption-edit save-post-caption" data-g="${gi}" data-c="${ci}">Save changes</button>
                <button type="button" class="cancel-caption-edit cancel-post-caption">Cancel</button>
              </div>
            </div>
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
  document.querySelectorAll('.edit-post-caption').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const option=button.closest('.caption-option');
    option.querySelector('.caption-display').classList.add('hidden');
    option.querySelector('.caption-editor').classList.remove('hidden');
    option.querySelector('textarea').focus();
  });
  document.querySelectorAll('.cancel-post-caption').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const option=button.closest('.caption-option');
    option.querySelector('.caption-editor').classList.add('hidden');
    option.querySelector('.caption-display').classList.remove('hidden');
  });
  document.querySelectorAll('.save-post-caption').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const groupIndex=+button.dataset.g;
    const captionIndex=+button.dataset.c;
    const text=cleanCaptionText(button.closest('.caption-editor').querySelector('textarea').value);
    if(!text){alert('Please enter caption text before saving.');return}
    state.groups[groupIndex].captions[captionIndex].text=text;
    state.groups[groupIndex].selected=captionIndex;
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
  const usedImageIds=new Set(
    state.groups.flatMap(group=>(group.images||[]).map(image=>image.image_id))
  );
  const items=state.groups.map((group,index)=>({
    order:index+1,
    type:normaliseIdeaType(group.format),
    label:group.format||'Post',
    time:`Best: ${group.schedule?.time||'Recommended time'}`,
    topic:group.title
  }));

  $('ideasSummary').innerHTML=
    `${state.groups.length} post ideas created. <span class="content-coverage-badge">✓ ${usedImageIds.size} of ${state.images.length} uploaded images used</span>`;

  $('ideasGrid').innerHTML=items.slice(0,50).map(item=>`
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
  state.storyIdeas=state.storyIdeas.map(idea=>({
    ...idea,
    captions:normaliseStoryCaptions(idea.captions||idea.text_options,idea.primary_subject)
  }));
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
          ${idea.primary_subject?`<p class="story-primary-subject"><strong>Main subject:</strong> ${esc(idea.primary_subject)}</p>`:''}
          ${idea.accuracyChecked?`<span class="story-accuracy-badge">✓ Checked against original image</span>`:''}
          <p class="story-purpose-copy">${esc(idea.description||'Use this as a short Story update for your audience.')}</p>
          <ol class="story-frames">
            ${(idea.frames||[]).slice(0,4).map(frame=>`<li>${esc(frame)}</li>`).join('')}
          </ol>
        </div>
      </div>

      <div class="caption-options story-caption-options">
        ${normaliseStoryCaptions(idea.captions,idea.primary_subject).map((caption,captionIndex)=>`
          <div class="caption-option story-caption-option ${captionIndex===idea.selected?'selected':''}"
               data-story="${index}" data-story-caption="${captionIndex}">
            <div class="caption-option-header">
              <strong>${esc(caption.label)}</strong>
              <button type="button" class="edit-caption-btn edit-story-caption" data-story="${index}" data-story-caption="${captionIndex}">Edit</button>
            </div>
            <div class="caption-display">
              <p>${esc(caption.text)}</p>
            </div>
            <div class="caption-editor hidden">
              <textarea class="caption-edit-area">${esc(caption.text)}</textarea>
              <div class="caption-edit-actions">
                <button type="button" class="save-caption-edit save-story-caption" data-story="${index}" data-story-caption="${captionIndex}">Save changes</button>
                <button type="button" class="cancel-caption-edit cancel-story-caption">Cancel</button>
              </div>
            </div>
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
  document.querySelectorAll('.edit-story-caption').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const option=button.closest('.caption-option');
    option.querySelector('.caption-display').classList.add('hidden');
    option.querySelector('.caption-editor').classList.remove('hidden');
    option.querySelector('textarea').focus();
  });
  document.querySelectorAll('.cancel-story-caption').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const option=button.closest('.caption-option');
    option.querySelector('.caption-editor').classList.add('hidden');
    option.querySelector('.caption-display').classList.remove('hidden');
  });
  document.querySelectorAll('.save-story-caption').forEach(button=>button.onclick=event=>{
    event.stopPropagation();
    const storyIndex=+button.dataset.story;
    const captionIndex=+button.dataset.storyCaption;
    const text=cleanCaptionText(button.closest('.caption-editor').querySelector('textarea').value);
    if(!text){alert('Please enter Story text before saving.');return}
    state.storyIdeas[storyIndex].captions[captionIndex].text=text;
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
try{const saved=JSON.parse(localStorage.getItem('picplanrBrandProfile')||'null');if(saved?.brandProfile){state.accountType=saved.accountType||state.accountType;state.brandProfile=saved.brandProfile;state.profile=saved.profile||profileFromBrand(saved.brandProfile);setTimeout(()=>renderBrandProfile(),0);}}catch{}
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

function previewUploadedScreenshot(input,wrapId,imageId,platform){const file=input.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const dataUrl=reader.result;$(imageId).src=dataUrl;$(wrapId).classList.remove('hidden');state.profileScreenshots[platform]=dataUrl;$('statusPill').textContent=`${platform==='instagram'?'Instagram':'TikTok'} screenshot ready for scoring`;};reader.readAsDataURL(file)}
if($('connectInstagramFromReview'))$('connectInstagramFromReview').onclick=()=>show('connections');
if($('connectTikTokFromReview'))$('connectTikTokFromReview').onclick=()=>show('connections');
if($('uploadInstagramScreenshot'))$('uploadInstagramScreenshot').onclick=()=>$('instagramScreenshotInput').click();
if($('instagramScreenshotInput'))$('instagramScreenshotInput').onchange=()=>previewUploadedScreenshot($('instagramScreenshotInput'),'instagramScreenshotPreviewWrap','instagramScreenshotPreview','instagram');
if($('uploadTikTokScreenshot'))$('uploadTikTokScreenshot').onclick=()=>$('tiktokScreenshotInput').click();
if($('tiktokScreenshotInput'))$('tiktokScreenshotInput').onchange=()=>previewUploadedScreenshot($('tiktokScreenshotInput'),'tiktokScreenshotPreviewWrap','tiktokScreenshotPreview','tiktok');

// Version 32 public Instagram connection and live account analysis
async function refreshInstagramConnection(){
  try{
    const r=await fetch('/api/instagram/status');
    const data=await r.json();
    if(data.connected){
      connectionState.instagram=true;
      if($('instagramStatus'))$('instagramStatus').textContent=`Connected as @${data.username||'Instagram'}`;
      if($('connectInstagram')){$('connectInstagram').textContent='Disconnect Instagram';$('connectInstagram').onclick=disconnectInstagram;}
      if($('connectionSummary'))$('connectionSummary').textContent='1 account connected';
      if($('statusPill'))$('statusPill').textContent='Instagram connected';
      const reviewButton=$('connectInstagramFromReview');
      if(reviewButton){reviewButton.textContent='Run live Instagram analysis';reviewButton.onclick=runLiveInstagramAnalysis;}
    }
  }catch(e){console.warn(e)}
}

async function disconnectInstagram(){
  if(!confirm('Disconnect this Instagram account from PicPlanr?'))return;
  const r=await fetch('/api/instagram/disconnect',{method:'POST'});
  if(r.ok)location.reload();
}

async function runLiveInstagramAnalysis(){
  const button=$('connectInstagramFromReview');
  showLoading('Reviewing live Instagram account','PicPlanr is checking recent posts, content mix, consistency and available performance data.',button);
  try{
    const r=await fetch('/api/instagram/analyse',{method:'POST'});
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||'Instagram analysis failed.');
    state.audit=data.audit;
    if(data.profile?.username){$('instagram').value='@'+data.profile.username;}
    renderAudit(data.audit);
    show('audit');
    $('statusPill').dataset.reviewScore=`Account strength ${data.audit.overall_score}/100`; $('statusPill').textContent=$('statusPill').dataset.reviewScore;
  }catch(e){alert(e.message)}finally{hideLoading(button)}
}

const params=new URLSearchParams(location.search);
if(params.get('instagram_status')==='connected'){
  history.replaceState({},'',location.pathname);
  setTimeout(()=>{refreshInstagramConnection();show('audit');},150);
}else if(params.get('instagram_status')==='error'){
  alert(params.get('message')||'Instagram could not be connected.');
  history.replaceState({},'',location.pathname);
}
refreshInstagramConnection();
