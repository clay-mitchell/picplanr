import crypto from 'node:crypto';

import {
  requireWorkspace,
  sendWorkspaceError
} from '../../_lib/authenticated-workspace.js';

import {
  validateSocialProvider
} from '../../_lib/social-connections.js';

const providerConfiguration={
  instagram:{
    enabledVariable:'INSTAGRAM_OAUTH_ENABLED',
    label:'Instagram'
  },
  linkedin:{
    enabledVariable:'LINKEDIN_OAUTH_ENABLED',
    label:'LinkedIn'
  },
  tiktok:{
    enabledVariable:'TIKTOK_OAUTH_ENABLED',
    label:'TikTok'
  }
};

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const {supabase,user,workspace}=await requireWorkspace(req);
    const provider=validateSocialProvider(req.body?.provider);
    const configuration=providerConfiguration[provider];

    if(String(process.env[configuration.enabledVariable]||'').toLowerCase()!=='true'){
      return res.status(409).json({
        error:`${configuration.label} connection is not live yet. PicPlanr will enable it after platform approval is complete.`,
        approval_required:true,
        provider
      });
    }

    // Create a short-lived, one-use state record before redirecting to a
    // provider. The raw state is returned to the browser; only its hash is
    // stored in the database.
    const rawState=crypto.randomBytes(32).toString('base64url');
    const stateHash=crypto
      .createHash('sha256')
      .update(rawState)
      .digest('hex');

    const expiresAt=new Date(Date.now()+10*60*1000).toISOString();

    const {error}=await supabase
      .from('social_oauth_states')
      .insert({
        workspace_id:workspace.id,
        user_id:user.id,
        provider,
        state_hash:stateHash,
        redirect_to:String(req.body?.return_to||'/').slice(0,500),
        expires_at:expiresAt
      });

    if(error)throw error;

    // Provider-specific authorisation URLs are intentionally not guessed.
    // They will be added from each platform's approved application settings.
    return res.status(501).json({
      error:`${configuration.label} is marked as enabled, but its approved OAuth authorisation route has not been installed yet.`,
      provider,
      state:rawState
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'PicPlanr could not start this social connection.'
    );
  }
}
