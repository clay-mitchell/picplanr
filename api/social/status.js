import {
  requireWorkspace,
  sendWorkspaceError
} from '../_lib/authenticated-workspace.js';

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const {supabase,workspace}=await requireWorkspace(req);

    const {data,error}=await supabase
      .from('social_connections')
      .select(
        'id,provider,provider_account_id,username,display_name,account_type,scopes,status,connected_at,token_expires_at,last_verified_at,last_error'
      )
      .eq('workspace_id',workspace.id)
      .eq('status','connected')
      .order('connected_at',{ascending:true});

    if(error)throw error;

    return res.status(200).json({
      workspace_id:workspace.id,
      connections:data||[]
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'PicPlanr could not load your connected accounts.'
    );
  }
}
