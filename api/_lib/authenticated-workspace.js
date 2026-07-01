import {createClient} from '@supabase/supabase-js';

const normaliseUrl=()=>String(process.env.SUPABASE_URL||'')
  .replace(/\/rest\/v1\/?$/,'')
  .replace(/\/$/,'');

const serviceClient=()=>{
  const url=normaliseUrl();
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase server settings are missing.');

  return createClient(url,key,{
    auth:{persistSession:false,autoRefreshToken:false}
  });
};

const bearerToken=req=>{
  const header=String(req.headers?.authorization||'');
  const match=header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]||'';
};

export async function requireWorkspace(req){
  const token=bearerToken(req);

  if(!token){
    const error=new Error('Sign in to continue.');
    error.statusCode=401;
    throw error;
  }

  const supabase=serviceClient();
  const {data:{user},error:userError}=await supabase.auth.getUser(token);

  if(userError||!user){
    const error=new Error('Your login has expired. Sign in again.');
    error.statusCode=401;
    throw error;
  }

  const {data:membership,error:membershipError}=await supabase
    .from('workspace_members')
    .select('workspace_id,role,workspaces!inner(id,name,owner_user_id)')
    .eq('user_id',user.id)
    .order('created_at',{ascending:true})
    .limit(1)
    .maybeSingle();

  if(membershipError)throw membershipError;

  if(!membership?.workspace_id){
    const {data,error}=await supabase.rpc('ensure_current_user_workspace',{
      requested_name:String(user.user_metadata?.full_name||'').trim()
        ?`${String(user.user_metadata.full_name).trim()}'s Workspace`
        :'My Workspace'
    });

    if(error)throw error;

    const row=Array.isArray(data)?data[0]:data;

    if(!row?.workspace_id){
      throw new Error('PicPlanr could not load your workspace.');
    }

    return {
      supabase,
      token,
      user,
      workspace:{
        id:row.workspace_id,
        name:row.workspace_name,
        role:row.member_role||'owner'
      }
    };
  }

  return {
    supabase,
    token,
    user,
    workspace:{
      id:membership.workspace_id,
      name:membership.workspaces?.name||'My Workspace',
      role:membership.role||'member'
    }
  };
}

export function sendWorkspaceError(res,error,fallback){
  const status=Number(error?.statusCode)||500;

  if(status>=500)console.error(error);

  return res.status(status).json({
    error:status===401
      ?String(error?.message||'Sign in to continue.')
      :fallback
  });
}
