import {encryptSecret,decryptSecret} from './crypto.js';

const baseUrl=()=>String(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
export async function db(path,{method='GET',body,prefer}={}){
  const url=baseUrl(),key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase server settings are missing.');
  const r=await fetch(`${url}/rest/v1/${path}`,{method,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{data=text}
  if(!r.ok)throw new Error(data?.message||data?.error||`Supabase request failed (${r.status}).`);
  return data;
}
export const configured=()=>Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.GOOGLE_REDIRECT_URI&&process.env.TOKEN_ENCRYPTION_KEY);
export function authUrl(state){
  const p=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,redirect_uri:process.env.GOOGLE_REDIRECT_URI,response_type:'code',access_type:'offline',prompt:'consent',include_granted_scopes:'true',state,scope:'openid email https://www.googleapis.com/auth/calendar.events'});
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}
export async function exchange(code){
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,redirect_uri:process.env.GOOGLE_REDIRECT_URI,grant_type:'authorization_code'})});
  const data=await r.json();if(!r.ok)throw new Error(data.error_description||data.error||'Google token exchange failed.');return data;
}
export async function api(path,{method='GET',body,token}={}){
  const r=await fetch(`https://www.googleapis.com${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const text=await r.text();let data={};try{data=text?JSON.parse(text):{}}catch{}
  if(!r.ok)throw new Error(data?.error?.message||`Google Calendar request failed (${r.status}).`);return data;
}
export async function connection(id){const rows=await db(`google_calendar_connections?id=eq.${encodeURIComponent(id)}&status=eq.connected&limit=1`);return rows?.[0]||null}
export async function tokenFor(c){
  if(c.token_expires_at&&new Date(c.token_expires_at).getTime()>Date.now()+60000)return decryptSecret(c.encrypted_access_token);
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,refresh_token:decryptSecret(c.encrypted_refresh_token),grant_type:'refresh_token'})});
  const data=await r.json();if(!r.ok)throw new Error(data.error_description||data.error||'Reconnect Google Calendar.');
  await db(`google_calendar_connections?id=eq.${encodeURIComponent(c.id)}`,{method:'PATCH',prefer:'return=minimal',body:{encrypted_access_token:encryptSecret(data.access_token),token_expires_at:new Date(Date.now()+(Number(data.expires_in)||3600)*1000).toISOString(),updated_at:new Date().toISOString()}});
  return data.access_token;
}
