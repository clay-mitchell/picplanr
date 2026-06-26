import {createClient} from '@supabase/supabase-js';

const getSupabase=()=>{
  const url=String(process.env.SUPABASE_URL||'').replace(/\/rest\/v1\/?$/,'').replace(/\/$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('Supabase server settings are missing.');
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
};

const authorised=req=>{
  const secret=process.env.CRON_SECRET;
  if(!secret)return false;
  return req.headers.authorization===`Bearer ${secret}`;
};

const chunks=(items,size)=>{
  const output=[];
  for(let index=0;index<items.length;index+=size){
    output.push(items.slice(index,index+size));
  }
  return output;
};

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed.'});
  }

  if(!authorised(req)){
    return res.status(401).json({error:'Unauthorised.'});
  }

  const supabase=getSupabase();
  const now=new Date().toISOString();

  try{
    const {data:expired,error:selectError}=await supabase
      .from('media_assets')
      .select('id,storage_bucket,storage_path')
      .eq('status','active')
      .not('expires_at','is',null)
      .lte('expires_at',now)
      .limit(500);

    if(selectError)throw selectError;

    if(!expired?.length){
      return res.status(200).json({
        checked_at:now,
        deleted:0,
        failed:0
      });
    }

    let deleted=0;
    let failed=0;
    const byBucket=new Map();

    expired.forEach(asset=>{
      if(!byBucket.has(asset.storage_bucket)){
        byBucket.set(asset.storage_bucket,[]);
      }
      byBucket.get(asset.storage_bucket).push(asset);
    });

    for(const [bucket,assets] of byBucket.entries()){
      for(const batch of chunks(assets,100)){
        const paths=batch.map(asset=>asset.storage_path);
        const ids=batch.map(asset=>asset.id);

        const {error:removeError}=await supabase
          .storage
          .from(bucket)
          .remove(paths);

        if(removeError){
          failed+=batch.length;

          await supabase
            .from('media_assets')
            .update({
              deletion_error:String(removeError.message||'Storage deletion failed.').slice(0,500),
              updated_at:new Date().toISOString()
            })
            .in('id',ids);

          continue;
        }

        const deletedAt=new Date().toISOString();

        const {error:updateError}=await supabase
          .from('media_assets')
          .update({
            status:'deleted',
            deleted_at:deletedAt,
            deletion_error:null,
            updated_at:deletedAt
          })
          .in('id',ids);

        if(updateError){
          failed+=batch.length;
          console.error('Files deleted but metadata update failed:',updateError);
        }else{
          deleted+=batch.length;
        }
      }
    }

    return res.status(200).json({
      checked_at:now,
      deleted,
      failed
    });
  }catch(error){
    console.error('Media cleanup failed:',error);
    return res.status(500).json({
      error:'Media cleanup could not complete.'
    });
  }
}
