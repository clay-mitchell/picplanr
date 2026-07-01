import {
  requireWorkspace,
  sendWorkspaceError
} from '../_lib/authenticated-workspace.js';

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({message:'Method not allowed.'});
  }

  try{
    const {supabase,workspace}=await requireWorkspace(req);

    const {data,error}=await supabase
      .from('social_connections')
      .select('id,username,display_name,account_type,status,metadata,connected_at,last_verified_at')
      .eq('workspace_id',workspace.id)
      .eq('provider','instagram')
      .eq('status','connected')
      .order('updated_at',{ascending:false})
      .limit(1)
      .maybeSingle();

    if(error)throw error;

    return res.status(200).json({
      configured:Boolean(
        process.env.META_APP_ID&&
        process.env.META_APP_SECRET&&
        process.env.META_REDIRECT_URI&&
        process.env.TOKEN_ENCRYPTION_KEY
      ),
      connected:Boolean(data),
      username:data?.username||null,
      displayName:data?.display_name||null,
      accountType:data?.account_type||null,
      metadata:data?.metadata||null,
      connectedAt:data?.connected_at||null,
      lastVerifiedAt:data?.last_verified_at||null
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'Instagram status could not be checked.'
    );
  }
}
