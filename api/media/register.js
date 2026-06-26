import {createClient} from '@supabase/supabase-js';

const getSupabase=()=>{
  const url=String(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase server settings are missing.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
};

const clean=value=>String(value||'').trim();

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const body=req.body||{};
    const storagePath=clean(body.storage_path);
    const storageBucket=clean(body.storage_bucket)||'picplanr-media';
    const mediaType=clean(body.media_type);
    const assetKind=clean(body.asset_kind)||'original';
    const sessionId=clean(body.session_id);

    if(!storagePath||!['image','video','thumbnail'].includes(mediaType)){
      return res.status(400).json({error:'Valid storage_path and media_type are required.'});
    }

    if(!['original','temporary_export','thumbnail','published_copy'].includes(assetKind)){
      return res.status(400).json({error:'Invalid asset_kind.'});
    }

    const supabase=getSupabase();

    const row={
      session_id:sessionId||null,
      user_id:body.user_id||null,
      scheduled_post_id:body.scheduled_post_id||null,
      storage_bucket:storageBucket,
      storage_path:storagePath,
      original_filename:clean(body.original_filename)||null,
      media_type:mediaType,
      asset_kind:assetKind,
      size_bytes:Number.isFinite(Number(body.size_bytes))?Number(body.size_bytes):null,
      mime_type:clean(body.mime_type)||null,
      status:'active',
      metadata:body.metadata&&typeof body.metadata==='object'?body.metadata:{}
    };

    const {data,error}=await supabase
      .from('media_assets')
      .upsert(row,{onConflict:'storage_bucket,storage_path'})
      .select('id,storage_bucket,storage_path,media_type,asset_kind,uploaded_at,expires_at,status')
      .single();

    if(error)throw error;

    return res.status(200).json({asset:data});
  }catch(error){
    console.error('Media registration failed:',error);
    return res.status(500).json({
      error:'PicPlanr could not register this media file.'
    });
  }
}
