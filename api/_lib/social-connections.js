import crypto from 'node:crypto';

const keyBuffer=()=>{
  const raw=String(process.env.TOKEN_ENCRYPTION_KEY||'').trim();

  if(!raw){
    throw new Error('TOKEN_ENCRYPTION_KEY is missing.');
  }

  // Accept a 64-character hexadecimal key or derive 32 bytes from
  // an existing long random secret.
  if(/^[a-f0-9]{64}$/i.test(raw)){
    return Buffer.from(raw,'hex');
  }

  return crypto.createHash('sha256').update(raw).digest();
};

export function encryptSocialToken(value){
  const plain=String(value||'');

  if(!plain)return null;

  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',keyBuffer(),iv);
  const encrypted=Buffer.concat([
    cipher.update(plain,'utf8'),
    cipher.final()
  ]);
  const tag=cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.');
}

export function decryptSocialToken(payload){
  if(!payload)return '';

  const [version,ivEncoded,tagEncoded,dataEncoded]=String(payload).split('.');

  if(version!=='v1'||!ivEncoded||!tagEncoded||!dataEncoded){
    throw new Error('Invalid encrypted social token.');
  }

  const decipher=crypto.createDecipheriv(
    'aes-256-gcm',
    keyBuffer(),
    Buffer.from(ivEncoded,'base64url')
  );

  decipher.setAuthTag(Buffer.from(tagEncoded,'base64url'));

  return Buffer.concat([
    decipher.update(Buffer.from(dataEncoded,'base64url')),
    decipher.final()
  ]).toString('utf8');
}

const allowedProviders=new Set(['instagram','linkedin','tiktok']);

export function validateSocialProvider(provider){
  const value=String(provider||'').trim().toLowerCase();

  if(!allowedProviders.has(value)){
    const error=new Error('Unsupported social platform.');
    error.statusCode=400;
    throw error;
  }

  return value;
}

export async function storeVerifiedSocialConnection({
  supabase,
  user,
  workspace,
  provider,
  providerAccountId,
  username,
  displayName,
  accountType,
  accessToken,
  refreshToken,
  tokenExpiresAt,
  scopes=[],
  metadata={}
}){
  const safeProvider=validateSocialProvider(provider);
  const safeAccountId=String(providerAccountId||'').trim();

  if(!safeAccountId){
    throw new Error('A verified platform account ID is required.');
  }

  // This helper is designed to be called only after the platform callback
  // has exchanged its authorisation code and verified the account identity.
  const row={
    workspace_id:workspace.id,
    user_id:user.id,
    provider:safeProvider,
    provider_account_id:safeAccountId,
    username:String(username||'').trim()||null,
    display_name:String(displayName||'').trim()||null,
    account_type:String(accountType||'').trim()||null,
    access_token_encrypted:encryptSocialToken(accessToken),
    refresh_token_encrypted:encryptSocialToken(refreshToken),
    token_expires_at:tokenExpiresAt||null,
    scopes:Array.isArray(scopes)
      ?scopes.map(value=>String(value)).filter(Boolean)
      :[],
    status:'connected',
    metadata:metadata&&typeof metadata==='object'?metadata:{},
    connected_at:new Date().toISOString(),
    updated_at:new Date().toISOString()
  };

  const {data,error}=await supabase
    .from('social_connections')
    .upsert(row,{
      onConflict:'workspace_id,provider,provider_account_id'
    })
    .select(
      'id,workspace_id,user_id,provider,provider_account_id,username,display_name,account_type,scopes,status,connected_at,token_expires_at'
    )
    .single();

  if(error)throw error;

  return data;
}
