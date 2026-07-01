import crypto from 'node:crypto';
import {cookie,safeReturnPath} from '../../_lib/http.js';
import {exchangeCode,getProfile} from '../../_lib/instagram.js';
import {encryptSecret} from '../../_lib/crypto.js';
import {saveInstagramConnection} from '../../_lib/supabase.js';

function stateSecret(){
  const secret=process.env.TOKEN_ENCRYPTION_KEY||process.env.META_APP_SECRET;

  if(!secret){
    throw new Error('Instagram security settings are missing.');
  }

  return secret;
}

function verifyState(value){
  if(typeof value!=='string'||!value.includes('.')){
    throw new Error('Instagram security check failed. Please reconnect.');
  }

  const [encoded,signature]=value.split('.');
  const expected=crypto
    .createHmac('sha256',stateSecret())
    .update(encoded)
    .digest('base64url');

  const receivedBuffer=Buffer.from(signature||'');
  const expectedBuffer=Buffer.from(expected);

  if(
    receivedBuffer.length!==expectedBuffer.length||
    !crypto.timingSafeEqual(receivedBuffer,expectedBuffer)
  ){
    throw new Error('Instagram security check failed. Please reconnect.');
  }

  const payload=JSON.parse(
    Buffer.from(encoded,'base64url').toString('utf8')
  );

  const age=Date.now()-Number(payload.issuedAt||0);

  if(age<0||age>15*60*1000){
    throw new Error('Instagram connection expired. Please reconnect.');
  }

  if(!payload.userId||!payload.workspaceId){
    throw new Error('Instagram was not linked to a PicPlanr workspace.');
  }

  return {
    userId:String(payload.userId),
    workspaceId:String(payload.workspaceId),
    origin:new URL(
      payload.origin||process.env.PICPLANR_APP_URL||'https://picplanrapp.com'
    ).origin,
    returnTo:safeReturnPath(payload.returnTo||'/?view=connections')
  };
}

function responsePage(res,{origin,returnTo,success,message=''}) {
  const payload=success
    ? {type:'picplanr-instagram-connected'}
    : {type:'picplanr-instagram-error',message};

  const separator=returnTo.includes('?')?'&':'?';
  const fallback=
    `${origin}${returnTo}${separator}`+
    `instagram_status=${success?'connected':'error'}`+
    `${message?`&message=${encodeURIComponent(message)}`:''}`;

  res.setHeader('Content-Type','text/html; charset=utf-8');
  return res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Returning to PicPlanr</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#070b14;color:#fff;font-family:Arial,sans-serif}
main{max-width:460px;padding:32px;text-align:center}
p{color:#aeb8d2;line-height:1.5}
</style>
</head>
<body>
<main>
<h1>${success?'Instagram connected':'Instagram connection failed'}</h1>
<p>${success?'Returning to PicPlanr…':message}</p>
</main>
<script>
const payload=${JSON.stringify(payload)};
const origin=${JSON.stringify(origin)};
const fallback=${JSON.stringify(fallback)};

if(window.opener&&!window.opener.closed){
  window.opener.postMessage(payload,origin);
  window.opener.focus();
  setTimeout(()=>window.close(),500);
}else{
  window.location.replace(fallback);
}
</script>
</body>
</html>`);
}

export default async function handler(req,res){
  let origin=process.env.PICPLANR_APP_URL||'https://picplanrapp.com';
  let returnTo='/?view=connections';

  try{
    if(req.query?.error){
      throw new Error(req.query.error_description||req.query.error);
    }

    if(!req.query?.code){
      throw new Error('Instagram did not return an authorisation code.');
    }

    const verified=verifyState(String(req.query?.state||''));
    origin=verified.origin;
    returnTo=verified.returnTo;

    const token=await exchangeCode(String(req.query.code));
    const profile=await getProfile(token.accessToken);
    const providerAccountId=String(
      profile.user_id||
      profile.id||
      token.userId||
      ''
    );

    if(!providerAccountId){
      throw new Error('Instagram did not return an account ID.');
    }

    const expiresAt=new Date(
      Date.now()+(Number(token.expiresIn)||3600)*1000
    ).toISOString();

    await saveInstagramConnection({
      workspace_id:verified.workspaceId,
      user_id:verified.userId,
      provider:'instagram',
      provider_account_id:providerAccountId,
      username:profile.username||null,
      display_name:profile.name||profile.username||null,
      account_type:profile.account_type||null,
      access_token_encrypted:encryptSecret(token.accessToken),
      refresh_token_encrypted:null,
      token_expires_at:expiresAt,
      scopes:[],
      status:'connected',
      metadata:{
        media_count:profile.media_count??null
      },
      connected_at:new Date().toISOString(),
      disconnected_at:null,
      last_verified_at:new Date().toISOString(),
      last_error:null,
      updated_at:new Date().toISOString()
    });

    res.setHeader('Set-Cookie',[
      cookie('pp_ig_state','',{maxAge:0}),
      cookie('pp_ig_return','',{maxAge:0})
    ]);

    return responsePage(res,{
      origin,
      returnTo,
      success:true
    });
  }catch(error){
    console.error('Instagram callback failed:',error);

    res.setHeader('Set-Cookie',[
      cookie('pp_ig_state','',{maxAge:0}),
      cookie('pp_ig_return','',{maxAge:0})
    ]);

    return responsePage(res,{
      origin:new URL(origin).origin,
      returnTo,
      success:false,
      message:error.message||'Instagram could not be connected.'
    });
  }
}
