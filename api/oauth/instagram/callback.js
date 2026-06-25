import crypto from 'node:crypto';
import {parseCookies,cookie,safeReturnPath} from '../../_lib/http.js';
import {exchangeCode,getProfile} from '../../_lib/instagram.js';
import {encryptSecret} from '../../_lib/crypto.js';
import {saveInstagramConnection} from '../../_lib/supabase.js';

function appOrigin(req){
  const proto=String(req.headers['x-forwarded-proto']||'https').split(',')[0].trim();
  const host=String(req.headers['x-forwarded-host']||req.headers.host||'').split(',')[0].trim();
  return `${proto}://${host}`;
}

function popupResponse(res,{origin,returnTo,status,message=''}) {
  const payload=status==='connected'
    ? {type:'picplanr-instagram-connected'}
    : {type:'picplanr-instagram-error',message};

  const fallbackUrl=`${origin}${returnTo}${returnTo.includes('?')?'&':'?'}instagram_status=${status}${message?`&message=${encodeURIComponent(message)}`:''}`;

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
        setTimeout(()=>window.close(),250);
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
  const returnTo=safeReturnPath(cookies.pp_ig_return||'/?instagram=connected');
  const origin=appOrigin(req);

  try{
    if(req.query?.error)throw new Error(req.query.error_description||req.query.error);
    if(!req.query?.code)throw new Error('Instagram did not return an authorisation code.');
    if(!req.query?.state||req.query.state!==cookies.pp_ig_state){
      throw new Error('Instagram connection security check failed. Please try again.');
    }

    const token=await exchangeCode(String(req.query.code));
    const profile=await getProfile(token.accessToken);
    const id=crypto.randomUUID();
    const expiresAt=new Date(Date.now()+(Number(token.expiresIn)||3600)*1000).toISOString();

    await saveInstagramConnection({
      id,
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
  }catch(e){
    console.error(e);

    res.setHeader('Set-Cookie',[
      cookie('pp_ig_state','',{maxAge:0}),
      cookie('pp_ig_return','',{maxAge:0})
    ]);

    return popupResponse(res,{
      origin,
      returnTo:'/',
      status:'error',
      message:e.message
    });
  }
}
