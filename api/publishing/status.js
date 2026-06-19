
export default async function handler(req,res){
  const configured=Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY);
  const testMode=process.env.PUBLISHING_TEST_MODE!=='false';
  res.status(200).json({
    configured,
    testMode,
    databaseReady:Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SERVICE_ROLE_KEY),
    storageReady:Boolean(process.env.BLOB_READ_WRITE_TOKEN||process.env.SUPABASE_STORAGE_BUCKET),
    instagramConfigured:Boolean(process.env.META_APP_ID&&process.env.META_APP_SECRET&&process.env.META_REDIRECT_URI),
    linkedinConfigured:Boolean(process.env.LINKEDIN_CLIENT_ID&&process.env.LINKEDIN_CLIENT_SECRET&&process.env.LINKEDIN_REDIRECT_URI),
    schedulerReady:Boolean(process.env.CRON_SECRET),
    instagramConnected:false,
    linkedinConnected:false
  });
}
