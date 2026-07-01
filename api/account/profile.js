import {
  requireWorkspace,
  sendWorkspaceError
} from '../_lib/authenticated-workspace.js';

export default async function handler(req,res){
  if(!['GET','PUT'].includes(req.method)){
    res.setHeader('Allow','GET, PUT');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const {supabase,user,workspace}=await requireWorkspace(req);

    if(req.method==='GET'){
      const {data,error}=await supabase
        .from('workspace_brand_profiles')
        .select('account_type,context,profile,website_analysis,updated_at')
        .eq('workspace_id',workspace.id)
        .maybeSingle();

      if(error)throw error;

      return res.status(200).json({
        memory:data?{
          account_type:data.account_type,
          context:data.context||{},
          profile:data.profile||null,
          website_analysis:data.website_analysis||null,
          updated_at:data.updated_at
        }:null
      });
    }

    const body=req.body||{};

    if(!body.profile||typeof body.profile!=='object'){
      return res.status(400).json({
        error:'A completed account voice profile is required.'
      });
    }

    const row={
      workspace_id:workspace.id,
      updated_by:user.id,
      account_type:String(body.account_type||'Business'),
      context:body.context&&typeof body.context==='object'?body.context:{},
      profile:body.profile,
      website_analysis:
        body.website_analysis&&typeof body.website_analysis==='object'
          ?body.website_analysis
          :null,
      updated_at:new Date().toISOString()
    };

    const {data,error}=await supabase
      .from('workspace_brand_profiles')
      .upsert(row,{onConflict:'workspace_id'})
      .select('account_type,context,profile,website_analysis,updated_at')
      .single();

    if(error)throw error;

    return res.status(200).json({
      saved:true,
      memory:{
        account_type:data.account_type,
        context:data.context||{},
        profile:data.profile||null,
        website_analysis:data.website_analysis||null,
        updated_at:data.updated_at
      }
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'The saved account voice could not be loaded.'
    );
  }
}
