import {
  requireWorkspace,
  sendWorkspaceError
} from '../_lib/authenticated-workspace.js';

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({message:'Method not allowed.'});
  }

  try{
    const {supabase,user,workspace}=await requireWorkspace(req);

    const {error}=await supabase
      .from('social_connections')
      .update({
        status:'disconnected',
        disconnected_at:new Date().toISOString(),
        updated_at:new Date().toISOString()
      })
      .eq('workspace_id',workspace.id)
      .eq('user_id',user.id)
      .eq('provider','instagram')
      .eq('status','connected');

    if(error)throw error;

    return res.status(200).json({disconnected:true});
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'Instagram could not be disconnected.'
    );
  }
}
