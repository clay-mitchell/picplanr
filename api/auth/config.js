export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed.'});
  }

  const url=String(process.env.SUPABASE_URL||'')
    .replace(/\/rest\/v1\/?$/,'')
    .replace(/\/$/,'');

  const anonKey=process.env.SUPABASE_ANON_KEY;

  if(!url||!anonKey){
    return res.status(503).json({
      error:'Supabase authentication variables are missing.'
    });
  }

  return res.status(200).json({url,anonKey});
}
