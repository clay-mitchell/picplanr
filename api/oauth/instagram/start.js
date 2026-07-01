import crypto from 'node:crypto';
import {cookie,safeReturnPath} from '../../_lib/http.js';
import {instagramAuthorisationUrl} from '../../_lib/instagram.js';
import {requireWorkspace,sendWorkspaceError} from '../../_lib/authenticated-workspace.js';

function appOrigin(){
  const value=process.env.PICPLANR_APP_URL||'https://picplanrapp.com';

  try{
    return new URL(value).origin;
  }catch{
    return 'https://picplanrapp.com';
  }
}

function stateSecret(){
  const secret=process.env.TOKEN_ENCRYPTION_KEY||process.env.META_APP_SECRET;

  if(!secret){
    throw new Error('Instagram security settings are missing in Vercel.');
  }

  return secret;
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
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({message:'Method not allowed.'});
  }

  try{
    if(!(process.env.META_APP_ID&&process.env.META_APP_SECRET&&process.env.META_REDIRECT_URI)){
      return res.status(503).json({
        message:'Instagram is not fully configured in Vercel.'
      });
    }

    const context=await requireWorkspace(req);
    const returnTo=safeReturnPath(req.query?.returnTo||'/?view=connections');
    const origin=appOrigin();

    const state=signState({
      nonce:crypto.randomBytes(24).toString('hex'),
      returnTo,
      origin,
      userId:context.user.id,
      workspaceId:context.workspace.id,
      issuedAt:Date.now()
    });

    res.setHeader('Set-Cookie',[
      cookie('pp_ig_state',state,{maxAge:900}),
      cookie('pp_ig_return',returnTo,{maxAge:900})
    ]);

    return res.status(200).json({
      configured:true,
      url:instagramAuthorisationUrl({state})
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'Instagram connection could not be started.'
    );
  }
}
