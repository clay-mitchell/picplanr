import crypto from 'node:crypto';
import {parseCookies,cookie} from '../_lib/http.js';
import {saveBrandProfile} from '../_lib/supabase.js';

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed.'});
  try{
    const profile=req.body?.profile;
    if(!profile||typeof profile!=='object')return res.status(400).json({error:'Brand profile is missing.'});
    const cookies=parseCookies(req);
    const sessionId=cookies.pp_brand_session||crypto.randomUUID();
    const saved=await saveBrandProfile({
      id:crypto.randomUUID(),
      session_id:sessionId,
      account_type:String(req.body?.accountType||'Business'),
      website:String(profile.website||''),
      business_name:String(profile.business_name||''),
      profile_data:profile,
      updated_at:new Date().toISOString()
    });
    if(!cookies.pp_brand_session)res.setHeader('Set-Cookie',cookie('pp_brand_session',sessionId,{maxAge:60*60*24*365}));
    return res.status(200).json({saved:true,id:saved?.id||null});
  }catch(error){
    console.error(error);
    return res.status(500).json({error:error.message||'The brand profile could not be saved.'});
  }
}
