import crypto from 'node:crypto';
import {parseCookies,cookie,safeReturnPath} from '../../_lib/http.js';
import {exchangeCode,getProfile} from '../../_lib/instagram.js';
import {encryptSecret} from '../../_lib/crypto.js';
import {saveInstagramConnection} from '../../_lib/supabase.js';

function stateSecret(){
  return process.env.TOKEN_ENCRYPTION_KEY || process.env.META_APP_SECRET;
}

function safeOrigin(value){
  try{
    const url=new URL(String(value||''));
    if(url.protocol!=='https:'&&url.protocol!=='http:')throw new Error();
    return url.origin;
  }catch{
    throw new Error('Instagram return address was invalid. Please reconnect Instagram.');
  }
}

function verifySignedState(value){
  if(typeof value!=='string'||!value.includes('.')){
    throw new Error('Instagram connection security check failed. Please try again.');
  }

  const [encoded,providedSignature]=value.split('.');
  if(!encoded||!providedSignature){
    throw new Error('Instagram connection security check failed. Please try again.');
  }

  const expectedSignature=crypto
    .createHmac('sha256',stateSecret())
    .update(encoded)
    .digest('base64url');

  const provided=Buffer.from(providedSignature);
  const expected=Buffer.from(expectedSignature);

  if(provided.length!==expected.length||!crypto.timingSafeEqual(provided,expected)){
    throw new Error('Instagram connection security check failed. Please try again.');
  }

  let payload;
  try{
    payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
  }catch{
    throw new Error('Instagram connection security check failed. Please try again.');
  }

  const age=Date.now()-Number(payload.issuedAt||0);
  if(!payload.issuedAt||age<0||age>15*60*1000){
    throw new Error('Instagram connection expired. Please reconnect Instagram.');
  }

  if(!payload.userId||!payload.workspaceId){
    throw new Error('Instagram connection was not linked to a PicPlanr account. Please try again.');
  }

  return {
    returnTo:safeReturnPath(payload.returnTo||'/?instagram=connected'),
    origin:safeOrigin(payload.origin),
    userId:String(payload.userId),
    workspaceId:String(payload.workspaceId)
  };
}

function popupResponse(res,{origin,returnTo,status,message=''}) {
  const payload=status==='connected'
    ? {type:'picplanr-instagram-connected'}
    : {type:'picplanr-instagram-error',message};

  const separator=returnTo.includes('?')?'&':'?';
  const fallbackUrl=`${origin}${returnTo}${separator}instagram_status=${status}${message?`&message=${encodeURIComponent(message)}`:''}`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Returning to PicPlanr</title>
  <style>
    body{margin:0;background:#070b14;color:#fff;font-family:Arial,sans-serif;display:grid;place-items:center;min-height:100vh}
    main{max-width:460px;padding:32px;text-align:center}
    h1{font-size:28px;margin:0 0 12px}
    p{color:#aeb8d2;line-height:1.5}
  </style>
</head>
<body>
  <main>
    <h1>${status==='connected'?'Instagram connected':'Instagram connection failed'}</h1>
    <p>${status==='connected'?'Returning you to PicPlanr now.':'You can return to PicPlanr and try again.'}</p>
  </main>
  <script>
    const payload=${JSON.stringify(payload)};
    const origin=${JSON.stringify(origin)};
    const fallback=${JSON.stringify(fallbackUrl)};

    try{
      if(window.opener && !window.opener.closed){
        window.opener.postMessage(payload,origin);
        window.opener.focus();
        setTimeout(()=>window.close(),350);
      }else{
        window.location.replace(fallback);
      }
    }catch{
      window.location.replace(fallback);
    }
  </script>
</body>
</html>`);
}

export default async function handler(req,res){
  const cookies=parseCookies(req);
  let returnTo=safeReturnPath(cookies.pp_ig_return||'/?instagram=connected');
  let origin='https://picplanrapp.com';

  try{
    if(req.query?.error){
      throw new Error(req.query.error_description||req.query.error);
    }

    if(!req.query?.code){
      throw new Error('Instagram did not return an authorisation code.');
    }

    const verified=verifySignedState(String(req.query?.state||''));
    returnTo=verified.returnTo;
    origin=verified.origin;

    const token=await exchangeCode(String(req.query.code));
    const profile=await getProfile(token.accessToken);
    const id=crypto.randomUUID();
    const expiresAt=new Date(
      Date.now()+(Number(token.expiresIn)||3600)*1000
    ).toISOString();

    await saveInstagramConnection({
      id,
      user_id:verified.userId,
      workspace_id:verified.workspaceId,
      provider:'instagram',
      provider_account_id:String(profile.user_id||profile.id||token.userId||''),
      provider_account_name:profile.username||'Instagram account',
      encrypted_access_token:encryptSecret(token.accessToken),
      token_expires_at:expiresAt,
      status:'connected',
      metadata:{
        account_type:profile.account_type||null,
        media_count:profile.media_count??null
      }
    });

    res.setHeader('Set-Cookie',[
      cookie('pp_ig_connection',id,{maxAge:60*60*24*30}),
      cookie('pp_ig_state','',{maxAge:0}),
      cookie('pp_ig_return','',{maxAge:0})
    ]);

    return popupResponse(res,{
      origin,
      returnTo,
      status:'connected'
    });
  }catch(error){
    console.error(error);

    res.setHeader('Set-Cookie',[
      cookie('pp_ig_state','',{maxAge:0}),
      cookie('pp_ig_return','',{maxAge:0})
    ]);

    return popupResponse(res,{
      origin,
      returnTo,
      status:'error',
      message:error.message||'Instagram could not be connected.'
    });
  }
}
