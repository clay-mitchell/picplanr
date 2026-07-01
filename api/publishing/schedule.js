import {requireWorkspace,sendWorkspaceError} from '../_lib/authenticated-workspace.js';

const clean=value=>String(value||'').trim();

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const {supabase,user,workspace}=await requireWorkspace(req);
    const posts=req.body?.posts;

    if(!Array.isArray(posts)||!posts.length){
      return res.status(400).json({error:'No scheduled posts supplied.'});
    }

    const rows=posts.map(post=>({
      workspace_id:workspace.id,
      user_id:user.id,
      local_id:clean(post.local_id),
      platform:clean(post.platform),
      title:clean(post.title)||null,
      caption:clean(post.caption),
      scheduled_for:post.scheduled_for,
      media_url:clean(post.media_url)||null,
      status:'scheduled',
      post_format:clean(post.post_format)||null,
      media_type:clean(post.media_type)||'image',
      google_calendar_event_id:clean(post.google_calendar_event_id)||null,
      google_calendar_sync_status:post.google_calendar_event_id
        ?'synced'
        :'not_synced',
      reminder_minutes:Number(post.reminder_minutes)||1440,
      updated_at:new Date().toISOString()
    }));

    if(rows.some(row=>!row.local_id||!row.platform||!row.caption||!row.scheduled_for)){
      return res.status(400).json({
        error:'Each scheduled post needs an ID, platform, caption and date.'
      });
    }

    const {data,error}=await supabase
      .from('scheduled_posts')
      .upsert(rows,{onConflict:'workspace_id,local_id'})
      .select('id,workspace_id,local_id,status,scheduled_for');

    if(error)throw error;

    return res.status(200).json({
      saved:data?.length||0,
      testMode:false,
      message:`${data?.length||0} posts saved securely to your workspace.`
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'PicPlanr could not save your publishing queue.'
    );
  }
}
