import {
  requireWorkspace,
  sendWorkspaceError
} from '../_lib/authenticated-workspace.js';

const MAX_HTML_BYTES=1_500_000;
const MAX_IMAGE_BYTES=2_000_000;

function normaliseWebsite(value){
  let input=String(value||'').trim();

  if(!input){
    throw new Error('A website address is required.');
  }

  if(!/^https?:\/\//i.test(input)){
    input=`https://${input}`;
  }

  const url=new URL(input);

  if(!['http:','https:'].includes(url.protocol)){
    throw new Error('Use a normal website address.');
  }

  return url;
}

function attributeValue(tag,name){
  const pattern=new RegExp(
    `${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'i'
  );
  const match=String(tag||'').match(pattern);
  return match?(match[1]||match[2]||match[3]||''):'';
}

function absoluteUrl(value,base){
  if(!value)return '';

  try{
    const url=new URL(
      String(value).replace(/&amp;/gi,'&').trim(),
      base
    );

    if(!['http:','https:'].includes(url.protocol))return '';
    return url.href;
  }catch{
    return '';
  }
}

function metaValue(html,name){
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns=[
    new RegExp(
      `<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["']`,
      'i'
    )
  ];

  for(const pattern of patterns){
    const match=html.match(pattern);
    if(match)return match[1];
  }

  return '';
}

function jsonLdLogos(html,base){
  const urls=[];
  const pattern=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  function visit(value){
    if(!value)return;

    if(Array.isArray(value)){
      value.forEach(visit);
      return;
    }

    if(typeof value!=='object')return;

    const logo=value.logo;

    if(typeof logo==='string'){
      const url=absoluteUrl(logo,base);
      if(url)urls.push(url);
    }else if(logo&&typeof logo==='object'){
      const url=absoluteUrl(
        logo.url||logo.contentUrl,
        base
      );
      if(url)urls.push(url);
    }

    Object.values(value).forEach(visit);
  }

  while((match=pattern.exec(html))){
    try{
      visit(JSON.parse(match[1]));
    }catch{}
  }

  return urls;
}

function logoCandidates(html,base){
  const candidates=[];
  const seen=new Set();

  const add=(value,score,source)=>{
    const url=absoluteUrl(value,base);

    if(!url||seen.has(url))return;

    seen.add(url);
    candidates.push({url,score,source});
  };

  jsonLdLogos(html,base).forEach(url=>{
    add(url,120,'structured website data');
  });

  add(metaValue(html,'og:logo'),110,'website metadata');
  add(metaValue(html,'logo'),105,'website metadata');

  for(const tag of html.match(/<img\b[^>]*>/gi)||[]){
    const src=
      attributeValue(tag,'src')||
      attributeValue(tag,'data-src')||
      attributeValue(tag,'data-lazy-src');

    const evidence=[
      attributeValue(tag,'alt'),
      attributeValue(tag,'class'),
      attributeValue(tag,'id'),
      src
    ].join(' ').toLowerCase();

    let score=0;

    if(evidence.includes('logo'))score+=90;
    if(evidence.includes('brand'))score+=25;
    if(evidence.includes('header'))score+=10;
    if(String(src).toLowerCase().includes('logo'))score+=30;
    if(String(src).toLowerCase().endsWith('.svg'))score+=8;

    if(score)add(src,score,'website logo image');
  }

  for(const tag of html.match(/<link\b[^>]*>/gi)||[]){
    const rel=attributeValue(tag,'rel').toLowerCase();
    const href=attributeValue(tag,'href');

    if(rel.includes('apple-touch-icon')){
      add(href,70,'Apple touch icon');
    }else if(rel.includes('icon')){
      add(href,55,'website icon');
    }
  }

  add(metaValue(html,'og:image'),35,'social preview image');

  return candidates.sort((a,b)=>b.score-a.score);
}

async function fetchWithTimeout(url,options={},timeoutMs=12000){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);

  try{
    return await fetch(url,{
      ...options,
      signal:controller.signal
    });
  }finally{
    clearTimeout(timeout);
  }
}

async function fetchLogo(candidate,website){
  const response=await fetchWithTimeout(
    candidate.url,
    {
      redirect:'follow',
      headers:{
        'user-agent':'Mozilla/5.0 PicPlanr Website Brand Reader',
        accept:'image/svg+xml,image/png,image/jpeg,image/webp,image/*;q=0.8,*/*;q=0.2',
        referer:website.origin+'/'
      }
    }
  );

  if(!response.ok)return null;

  const contentType=String(
    response.headers.get('content-type')||''
  ).split(';')[0].trim().toLowerCase();

  if(
    !contentType.startsWith('image/')&&
    contentType!=='application/svg+xml'
  ){
    return null;
  }

  const buffer=Buffer.from(await response.arrayBuffer());

  if(!buffer.length||buffer.length>MAX_IMAGE_BYTES){
    return null;
  }

  const safeType=
    contentType==='application/svg+xml'
      ?'image/svg+xml'
      :contentType;

  return {
    dataUrl:`data:${safeType};base64,${buffer.toString('base64')}`,
    source:candidate.source,
    originalUrl:candidate.url
  };
}

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    await requireWorkspace(req);

    const website=normaliseWebsite(req.query?.website);

    const pageResponse=await fetchWithTimeout(
      website,
      {
        redirect:'follow',
        headers:{
          'user-agent':'Mozilla/5.0 PicPlanr Website Brand Reader',
          accept:'text/html,application/xhtml+xml'
        }
      }
    );

    if(!pageResponse.ok){
      throw new Error(`The website returned ${pageResponse.status}.`);
    }

    const html=(await pageResponse.text()).slice(0,MAX_HTML_BYTES);
    const finalUrl=new URL(pageResponse.url||website.href);
    const candidates=logoCandidates(html,finalUrl);

    for(const candidate of candidates.slice(0,12)){
      try{
        const logo=await fetchLogo(candidate,finalUrl);
        if(logo){
          return res.status(200).json({
            logoDataUrl:logo.dataUrl,
            source:logo.source,
            originalUrl:logo.originalUrl,
            website:finalUrl.href
          });
        }
      }catch{}
    }

    return res.status(200).json({
      logoDataUrl:'',
      source:'',
      website:finalUrl.href
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'PicPlanr could not find a usable website logo.'
    );
  }
}
