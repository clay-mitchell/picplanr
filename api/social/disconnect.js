import {
  requireWorkspace,
  sendWorkspaceError
} from '../_lib/authenticated-workspace.js';

import {
  validateSocialProvider
} from '../_lib/social-connections.js';

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const {supabase,user,workspace}=await requireWorkspace(req);
    const provider=validateSocialProvider(req.body?.provider);
    const connectionId=String(req.body?.connection_id||'').trim();

    let query=supabase
      .from('social_connections')
      .update({
        status:'disconnected',
        access_token_encrypted:null,
        refresh_token_encrypted:null,
        disconnected_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      })
      .eq('workspace_id',workspace.id)
      .eq('provider',provider)
      .eq('user_id',user.id)
      .eq('status','connected');

    if(connectionId){
      query=query.eq('id',connectionId);
    }

    const {data,error}=await query
      .select('id,provider,status');

    if(error)throw error;

    if(!data?.length){
      return res.status(404).json({
        error:'No matching connected account was found in your workspace.'
      });
    }

    return res.status(200).json({
      disconnected:data.length,
      provider
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'PicPlanr could not disconnect this account.'
    );
  }
}
