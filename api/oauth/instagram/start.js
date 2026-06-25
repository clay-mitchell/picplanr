import crypto from 'node:crypto';
import {cookie,safeReturnPath} from '../../_lib/http.js';
import {instagramAuthorisationUrl} from '../../_lib/instagram.js';

function stateSecret(){
  return process.env.TOKEN_ENCRYPTION_KEY || process.env.META_APP_SECRET;
}

function signState(payload){
  const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature=crypto
    .createHmac('sha256',stateSecret())
    .update(encoded)
    .digest('base64url');

  return `${encoded}.${signature}`;
}

export default async function handler(req,res){
  try{
    if(!(process.env.META_APP_ID&&process.env.META_APP_SECRET&&process.env.META_REDIRECT_URI)){
      return res.status(503).json({
        configured:false,
        message:'Instagram Login is not fully configured in Vercel.'
      });
    }

    if(!(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY&&process.env.TOKEN_ENCRYPTION_KEY)){
      return res.status(503).json({
        configured:false,
        message:'Secure connection storage is not fully configured.'
      });
    }

    const returnTo=safeReturnPath(req.query?.returnTo||'/?instagram=connected');
    const state=signState({
      nonce:crypto.randomBytes(24).toString('hex'),
      returnTo,
      issuedAt:Date.now()
    });

    // Keep these only as backward-compatible fallbacks.
    res.setHeader('Set-Cookie',[
      cookie('pp_ig_state',state,{maxAge:900}),
      cookie('pp_ig_return',returnTo,{maxAge:900})
    ]);

    return res.status(200).json({
      configured:true,
      url:instagramAuthorisationUrl({state})
    });
  }catch(e){
    console.error(e);
    return res.status(500).json({
      configured:false,
      message:e.message||'Instagram connection could not be started.'
    });
  }
}
