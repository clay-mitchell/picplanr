import crypto from 'node:crypto';
import {requireWorkspace} from '../_lib/authenticated-workspace.js';
import {decryptSecret} from '../_lib/crypto.js';
import {
  getWorkspaceBilling,
  assertAndConsumeUsage
} from '../_lib/billing.js';

const graphBase=()=>String(
  process.env.INSTAGRAM_GRAPH_BASE_URL||
  'https://graph.instagram.com'
).replace(/\/$/,'');

function dataUrlToBuffer(value){
  const match=String(value||'').match(
    /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/
  );

  if(!match){
    throw Object.assign(
      new Error('Use a JPG, PNG or WebP image for Instagram publishing.'),
      {statusCode:400}
    );
  }

  const buffer=Buffer.from(match[2],'base64');

  if(!buffer.length){
    throw Object.assign(
      new Error('The selected image is empty.'),
      {statusCode:400}
    );
  }

  if(buffer.length>8*1024*1024){
    throw Object.assign(
      new Error('The selected image is too large. Use an image under 8 MB.'),
      {statusCode:400}
    );
  }

  return {
    buffer,
    mimeType:match[1],
    extension:match[1]==='image/png'
      ?'png'
      :match[1]==='image/webp'
        ?'webp'
        :'jpg'
  };
}

async function graphRequest(path,params){
  const response=await fetch(`${graphBase()}${path}`,{
    method:'POST',
    headers:{
      'Content-Type':'application/x-www-form-urlencoded'
    },
    body:new URLSearchParams(params)
  });

  const text=await response.text();
  let data={};

  try{
    data=text?JSON.parse(text):{};
  }catch{
    data={raw:text};
  }

  if(!response.ok||data.error){
    const error=new Error(
      data.error?.message||
      data.error_description||
      `Instagram request failed (${response.status}).`
    );
    error.statusCode=response.status===401?401:400;
    error.metaCode=data.error?.code;
    error.metaSubcode=data.error?.error_subcode;
    throw error;
  }

  return data;
}

async function graphGet(path,params){
  const query=new URLSearchParams(params);
  const response=await fetch(`${graphBase()}${path}?${query}`);
  const data=await response.json().catch(()=>({}));

  if(!response.ok||data.error){
    throw new Error(
      data.error?.message||
      `Instagram request failed (${response.status}).`
    );
  }

  return data;
}

function publicStorageUrl(supabase,path){
  const {data}=supabase.storage
    .from('picplanr-publishing')
    .getPublicUrl(path);

  return data?.publicUrl||'';
}

function connectionToken(row){
  return (
    row.access_token_encrypted||
    row.encrypted_access_token||
    ''
  );
}

function connectionUsername(row){
  return (
    row.username||
    row.provider_account_name||
    row.display_name||
    'Instagram'
  );
}

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }

  let workspaceId=null;
  let scheduledPostId=null;
  let connection=null;
  let stage='authentication';

  try{
    const {
      supabase,
      user,
      workspace
    }=await requireWorkspace(req);

    stage='subscription check';

    workspaceId=workspace.id;

    const billing=await getWorkspaceBilling(supabase,workspace.id);

    if(
      billing.isTrial||
      !billing.paidAccess
    ){
      return res.status(402).json({
        error:'Choose a paid PicPlanr plan before publishing to Instagram.',
        code:'subscription_required',
        upgradeRequired:true
      });
    }

    const currentUsage=Number(
      billing.usage.scheduled_posts||0
    );
    const limit=Number(
      billing.plan.limits.scheduled_posts||0
    );

    if(currentUsage>=limit){
      return res.status(402).json({
        error:`You have reached the ${billing.plan.name} scheduled post limit.`,
        code:'plan_limit_reached',
        upgradeRequired:true
      });
    }

    stage='request validation';

    const {
      localId,
      title,
      caption,
      imageDataUrl,
      postFormat,
      scheduledFor
    }=req.body||{};

    const cleanCaption=String(caption||'').trim();

    if(!cleanCaption){
      return res.status(400).json({
        error:'Add a caption before publishing.'
      });
    }

    const image=dataUrlToBuffer(imageDataUrl);

    stage='Instagram connection lookup';

    const {
      data:connectionRow,
      error:connectionError
    }=await supabase
      .from('social_connections')
      .select('*')
      .eq('workspace_id',workspace.id)
      .eq('provider','instagram')
      .eq('status','connected')
      .order('updated_at',{ascending:false})
      .limit(1)
      .maybeSingle();

    if(connectionError)throw connectionError;

    if(!connectionRow){
      return res.status(409).json({
        error:'Instagram is not connected. Reconnect the account and try again.',
        code:'instagram_connection_expired'
      });
    }

    connection=connectionRow;

    if(
      connection.token_expires_at&&
      new Date(connection.token_expires_at).getTime()<=Date.now()
    ){
      await supabase
        .from('social_connections')
        .update({
          status:'expired',
          last_error:'Instagram access token expired.',
          updated_at:new Date().toISOString()
        })
        .eq('id',connection.id);

      return res.status(409).json({
        error:'The Instagram connection has expired. Reconnect Instagram and try again.',
        code:'instagram_connection_expired'
      });
    }

    const encryptedToken=connectionToken(connection);

    if(!encryptedToken){
      throw new Error('The Instagram connection does not contain a secure access token.');
    }

    stage='Instagram token decryption';
    const accessToken=decryptSecret(encryptedToken);
    const instagramUserId=String(
      connection.provider_account_id||
      ''
    ).trim();

    if(!instagramUserId){
      throw new Error('The connected Instagram account ID is missing.');
    }

    const objectId=crypto.randomUUID();
    const storagePath=
      `${workspace.id}/${objectId}.${image.extension}`;

    stage='temporary image upload';

    const {
      error:uploadError
    }=await supabase.storage
      .from('picplanr-publishing')
      .upload(
        storagePath,
        image.buffer,
        {
          contentType:image.mimeType,
          cacheControl:'3600',
          upsert:false
        }
      );

    if(uploadError)throw uploadError;

    const imageUrl=publicStorageUrl(
      supabase,
      storagePath
    );

    if(!imageUrl){
      throw new Error('PicPlanr could not create a public image address for Instagram.');
    }

    stage='publishing record creation';

    const {
      data:postRow,
      error:postError
    }=await supabase
      .from('scheduled_posts')
      .insert({
        workspace_id:workspace.id,
        user_id:user.id,
        local_id:String(localId||objectId),
        social_connection_id:connection.id,
        platform:'instagram',
        title:String(title||'Instagram post'),
        caption:cleanCaption,
        media_url:imageUrl,
        post_format:String(postFormat||'single_image'),
        media_type:'image',
        scheduled_for:scheduledFor||new Date().toISOString(),
        status:'publishing',
        updated_at:new Date().toISOString()
      })
      .select('id')
      .single();

    if(postError)throw postError;
    scheduledPostId=postRow.id;

    stage='Instagram media container creation';

    const container=await graphRequest(
      `/${encodeURIComponent(instagramUserId)}/media`,
      {
        image_url:imageUrl,
        caption:cleanCaption,
        access_token:accessToken
      }
    );

    if(!container.id){
      throw new Error('Instagram did not create a media container.');
    }

    stage='Instagram media publish';

    const published=await graphRequest(
      `/${encodeURIComponent(instagramUserId)}/media_publish`,
      {
        creation_id:String(container.id),
        access_token:accessToken
      }
    );

    if(!published.id){
      throw new Error('Instagram did not return a published media ID.');
    }

    let permalink='';

    try{
      const media=await graphGet(
        `/${encodeURIComponent(published.id)}`,
        {
          fields:'id,permalink',
          access_token:accessToken
        }
      );
      permalink=media.permalink||'';
    }catch{}

    const publishedAt=new Date().toISOString();

    await supabase
      .from('scheduled_posts')
      .update({
        status:'published',
        provider_post_id:String(published.id),
        published_at:publishedAt,
        last_error:null,
        updated_at:publishedAt
      })
      .eq('id',scheduledPostId);

    await supabase
      .from('publish_attempts')
      .insert({
        scheduled_post_id:scheduledPostId,
        successful:true,
        provider_response:{
          container_id:container.id,
          media_id:published.id,
          permalink
        }
      });

    await supabase
      .from('media_assets')
      .insert({
        workspace_id:workspace.id,
        user_id:user.id,
        scheduled_post_id:scheduledPostId,
        storage_bucket:'picplanr-publishing',
        storage_path:storagePath,
        original_filename:`${objectId}.${image.extension}`,
        media_type:'image',
        asset_kind:'published_copy',
        size_bytes:image.buffer.length,
        mime_type:image.mimeType,
        status:'active',
        expires_at:new Date(
          Date.now()+7*24*60*60*1000
        ).toISOString(),
        metadata:{
          instagram_media_id:String(published.id)
        }
      });

    stage='usage recording';

    await assertAndConsumeUsage({
      supabase,
      workspaceId:workspace.id,
      metric:'scheduled_posts',
      quantity:1,
      metadata:{
        provider:'instagram',
        provider_post_id:String(published.id)
      }
    });

    return res.status(200).json({
      published:true,
      instagramMediaId:String(published.id),
      permalink,
      username:connectionUsername(connection),
      publishedAt
    });
  }catch(error){
    console.error('Instagram publishing failed',{
      stage,
      message:error?.message,
      code:error?.code,
      metaCode:error?.metaCode,
      metaSubcode:error?.metaSubcode,
      statusCode:error?.statusCode
    });

    if(workspaceId&&connection&&(
      error?.statusCode===401||
      error?.metaCode===190
    )){
      try{
        const {
          supabase
        }=await requireWorkspace(req);

        await supabase
          .from('social_connections')
          .update({
            status:'expired',
            last_error:error.message,
            updated_at:new Date().toISOString()
          })
          .eq('id',connection.id);
      }catch{}

      return res.status(409).json({
        error:'The Instagram connection has expired. Reconnect Instagram and try again.',
        code:'instagram_connection_expired'
      });
    }

    if(scheduledPostId){
      try{
        const {
          supabase
        }=await requireWorkspace(req);

        await supabase
          .from('scheduled_posts')
          .update({
            status:'needs_attention',
            last_error:error.message,
            updated_at:new Date().toISOString()
          })
          .eq('id',scheduledPostId);

        await supabase
          .from('publish_attempts')
          .insert({
            scheduled_post_id:scheduledPostId,
            successful:false,
            provider_response:{
              meta_code:error?.metaCode||null,
              meta_subcode:error?.metaSubcode||null
            },
            error_message:error.message
          });
      }catch{}
    }

    const safeMessage=
      error?.message||
      'Instagram could not publish this post.';

    return res.status(
      Number(error?.statusCode)||500
    ).json({
      error:safeMessage,
      stage,
      code:error?.code||'instagram_publish_failed',
      metaCode:error?.metaCode||null,
      metaSubcode:error?.metaSubcode||null
    });
  }
}
