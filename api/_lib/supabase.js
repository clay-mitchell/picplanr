function normaliseSupabaseUrl(value){
  const raw=String(value||'').trim();

  if(!raw){
    throw new Error('Supabase server settings are missing.');
  }

  let parsed;
  try{
    parsed=new URL(raw);
  }catch{
    throw new Error('SUPABASE_URL must be a valid address such as https://your-project.supabase.co');
  }

  if(!parsed.hostname.endsWith('.supabase.co')){
    throw new Error('SUPABASE_URL must be your Supabase project URL ending in .supabase.co');
  }

  return parsed.origin;
}

const required=()=>{
  const url=normaliseSupabaseUrl(process.env.SUPABASE_URL);
  const key=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();

  if(!key){
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing.');
  }

  return {url,key};
};

async function request(path,{method='GET',body,headers={}}={}){
  const {url,key}=required();
  const cleanPath=String(path||'').replace(/^\/+/,'');
  const requestUrl=`${url}/rest/v1/${cleanPath}`;

  const r=await fetch(requestUrl,{
    method,
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      'Content-Type':'application/json',
      ...headers
    },
    body:body===undefined?undefined:JSON.stringify(body)
  });

  const text=await r.text();

  let data=null;
  try{
    data=text?JSON.parse(text):null;
  }catch{
    data=text||null;
  }

  if(!r.ok){
    const message=
      data?.message||
      data?.error||
      (typeof data==='string'?data:'')||
      `Supabase request failed (${r.status}).`;

    throw new Error(message);
  }

  return data;
}

export async function saveInstagramConnection(row){
  return request('social_connections',{
    method:'POST',
    body:row,
    headers:{Prefer:'return=representation'}
  }).then(x=>x?.[0]);
}

export async function getInstagramConnection(id){
  const rows=await request(
    `social_connections?id=eq.${encodeURIComponent(id)}&provider=eq.instagram&limit=1`
  );

  return rows?.[0]||null;
}

export async function deleteInstagramConnection(id){
  return request(
    `social_connections?id=eq.${encodeURIComponent(id)}&provider=eq.instagram`,
    {
      method:'DELETE',
      headers:{Prefer:'return=minimal'}
    }
  );
}

export async function saveBrandProfile(row){
  const existing=await request(
    `brand_profiles?session_id=eq.${encodeURIComponent(row.session_id)}&limit=1`
  );

  if(existing?.[0]?.id){
    const updated=await request(
      `brand_profiles?id=eq.${encodeURIComponent(existing[0].id)}`,
      {
        method:'PATCH',
        body:{
          account_type:row.account_type,
          website:row.website,
          business_name:row.business_name,
          profile_data:row.profile_data,
          updated_at:row.updated_at
        },
        headers:{Prefer:'return=representation'}
      }
    );

    return updated?.[0]||null;
  }

  return request('brand_profiles',{
    method:'POST',
    body:row,
    headers:{Prefer:'return=representation'}
  }).then(x=>x?.[0]);
}
export async function saveLinkedInConnection(row) {
  return request('social_connections', {
    method: 'POST',
    body: row,
    headers: {
      Prefer: 'return=representation'
    }
  }).then((result) => result?.[0]);
}
