
export default async function handler(req,res){
  if(!(process.env.META_APP_ID&&process.env.META_REDIRECT_URI)){
    return res.status(200).json({configured:false,message:'Instagram connection needs a Meta developer application ID and approved redirect address.'});
  }
  // The exact authorisation URL and scopes should be confirmed inside the approved Meta application.
  return res.status(200).json({
    configured:true,
    message:'Meta credentials are present. Complete the approved Instagram authorisation configuration before enabling live user connections.'
  });
}
