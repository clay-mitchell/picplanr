import dns from 'node:dns/promises';
import net from 'node:net';
import OpenAI from 'openai';

const client=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
const MAX_PAGES=4;
const MAX_TEXT=28000;

function normaliseUrl(value){
  const raw=String(value||'').trim();
  if(!raw)throw new Error('Please enter a website address.');
  const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw}`);
  if(!['http:','https:'].includes(url.protocol))throw new Error('Only public website addresses can be analysed.');
  url.hash='';
  return url;
}

function isPrivateIp(ip){
  if(net.isIPv4(ip)){
    const p=ip.split('.').map(Number);
    return p[0]===10||p[0]===127||p[0]===0||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168);
  }
  const x=ip.toLowerCase();
  return x==='::1'||x.startsWith('fc')||x.startsWith('fd')||x.startsWith('fe80:');
}

async function assertPublicHost(url){
  if(['localhost','0.0.0.0'].includes(url.hostname))throw new Error('This website address cannot be analysed.');
  const records=await dns.lookup(url.hostname,{all:true});
  if(!records.length||records.some(r=>isPrivateIp(r.address)))throw new Error('This website address cannot be analysed.');
}

function decodeEntities(text){
  return String(text||'')
    .replace(/&nbsp;/gi,' ')
    .replace(/&amp;/gi,'&')
    .replace(/&quot;/gi,'"')
    .replace(/&#39;|&apos;/gi,"'")
    .replace(/&lt;/gi,'<')
    .replace(/&gt;/gi,'>')
    .replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}

function stripHtml(html){
  return decodeEntities(String(html||'')
    .replace(/<script[\s\S]*?<\/script>/gi,' ')
    .replace(/<style[\s\S]*?<\/style>/gi,' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi,' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi,' ')
    .replace(/<[^>]+>/g,' '))
    .replace(/\s+/g,' ')
    .trim();
}

function extractMeta(html,name){
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const patterns=[
    new RegExp(`<meta[^>]+(?:name|property)=["']${escaped}["'][^>]+content=["']([^"']*)["']`,'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:name|property)=["']${escaped}["']`,'i')
  ];
  for(const pattern of patterns){const match=html.match(pattern);if(match)return decodeEntities(match[1]);}
  return '';
}

function extractTitle(html){
  const m=html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?stripHtml(m[1]):'';
}

function discoverLinks(html,base){
  const found=[];
  const pattern=/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while((match=pattern.exec(html))){
    try{
      const url=new URL(match[1],base);
      if(url.origin!==base.origin)continue;
      const label=stripHtml(match[2]).toLowerCase();
      const path=url.pathname.toLowerCase();
      const score=(/about|our-story|who-we-are/.test(path+' '+label)?4:0)+(/service|product|what-we-do|solutions/.test(path+' '+label)?3:0)+(/contact|location/.test(path+' '+label)?2:0);
      if(score)found.push({url:url.href.split('#')[0],score});
    }catch{}
  }
  return [...new Map(found.sort((a,b)=>b.score-a.score).map(x=>[x.url,x])).values()].slice(0,MAX_PAGES-1);
}

async function fetchPage(url){
  await assertPublicHost(url);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),9000);
  try{
    const response=await fetch(url,{signal:controller.signal,redirect:'follow',headers:{'user-agent':'PicPlanr Brand Analyser/1.0','accept':'text/html,application/xhtml+xml'}});
    if(!response.ok)throw new Error(`Website returned ${response.status}.`);
    const type=response.headers.get('content-type')||'';
    if(!type.includes('text/html')&&!type.includes('application/xhtml+xml'))throw new Error('The website did not return a readable page.');
    const html=(await response.text()).slice(0,350000);
    return {url:new URL(response.url),html};
  }finally{clearTimeout(timer)}
}

async function collectWebsite(startUrl){
  const first=await fetchPage(startUrl);
  const links=discoverLinks(first.html,first.url);
  const pages=[first];
  for(const item of links){
    try{pages.push(await fetchPage(new URL(item.url)));}catch{}
  }
  return pages.map(page=>({
    url:page.url.href,
    title:extractTitle(page.html),
    description:extractMeta(page.html,'description')||extractMeta(page.html,'og:description'),
    text:stripHtml(page.html).slice(0,9000)
  }));
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:'OPENAI_API_KEY is missing.'});
  try{
    const website=normaliseUrl(req.body?.website);
    const pages=await collectWebsite(website);
    const combined=pages.map(p=>`PAGE: ${p.url}\nTITLE: ${p.title}\nDESCRIPTION: ${p.description}\nTEXT: ${p.text}`).join('\n\n').slice(0,MAX_TEXT);
    if(combined.replace(/\s/g,'').length<300)throw new Error('We could not read enough useful information from this website.');
    const supplied=req.body?.providedContext||{};
    const prompt=`You are PicPlanr's evidence-led brand analyst. Analyse only the public website text and the details explicitly supplied by the customer. Never invent services, locations, audiences, claims, awards, prices, results or social profiles. Use British English. Website: ${website.href}. Customer-supplied context: ${JSON.stringify(supplied)}. Public website pages: ${combined}. Return strict JSON with: business_name string, brand_summary string, industry string, location string, products_services array of 2 to 8 strings, target_audience string, brand_personality array of 3 to 5 strings, tone_of_voice string, key_selling_points array of 2 to 6 strings, content_themes array of exactly 5 strings, quick_wins array of exactly 3 practical strings, recommended_platforms array, social_links object with instagram, linkedin and tiktok strings or empty strings, confidence_note string. Every statement must be supported by the website or supplied context. When information is missing, say it is not clear rather than guessing. Do not use em dashes or en dashes.`;
    const result=await client.responses.create({model:process.env.OPENAI_TEXT_MODEL||'gpt-4.1-mini',input:[{role:'user',content:[{type:'input_text',text:prompt}]}],text:{format:{type:'json_object'}}});
    const brand=JSON.parse(result.output_text);
    brand.website=website.href;
    brand.source_pages=pages.map(p=>p.url);
    const profile={
      summary:brand.brand_summary,
      voice_traits:brand.brand_personality,
      content_direction:(brand.content_themes||[]).join(', '),
      writing_rules:brand.tone_of_voice,
      confidence_note:brand.confidence_note,
      brand_profile:brand
    };
    return res.status(200).json({brand_profile:brand,profile});
  }catch(error){
    console.error(error);
    const message=error?.name==='AbortError'?'The website took too long to respond. Please try again.':(error.message||'Website analysis failed.');
    return res.status(400).json({error:message});
  }
}
