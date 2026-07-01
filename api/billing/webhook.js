export const config={api:{bodyParser:false}};

async function rawBody(req){
  const chunks=[];
  for await(const chunk of req)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  return Buffer.concat(chunks);
}

function planFromPrice(priceId){
  const pairs=[
    ['starter',process.env.STRIPE_PRICE_STARTER],
    ['business',process.env.STRIPE_PRICE_BUSINESS],
    ['pro',process.env.STRIPE_PRICE_PRO]
  ];
  return pairs.find(([,id])=>id&&id===priceId)?.[0]||'starter';
}

function normaliseStatus(value){
  const status=String(value||'incomplete');
  if(status==='canceled')return 'cancelled';
  if(['active','trialing','past_due','unpaid','incomplete','paused'].includes(status))return status;
  return 'incomplete';
}

async function updateWorkspace(supabase,subscription){
  const workspaceId=subscription.metadata?.workspace_id;
  if(!workspaceId)return;

  const priceId=subscription.items?.data?.[0]?.price?.id||null;
  const planKey=subscription.metadata?.plan_key||planFromPrice(priceId);
  const periodStart=subscription.current_period_start
    ?new Date(subscription.current_period_start*1000).toISOString()
    :null;
  const periodEnd=subscription.current_period_end
    ?new Date(subscription.current_period_end*1000).toISOString()
    :null;

  const {error}=await supabase
    .from('workspace_subscriptions')
    .upsert({
      workspace_id:workspaceId,
      plan_key:planKey,
      status:normaliseStatus(subscription.status),
      stripe_customer_id:String(subscription.customer||'')||null,
      stripe_subscription_id:subscription.id,
      stripe_price_id:priceId,
      current_period_start:periodStart,
      current_period_end:periodEnd,
      cancel_at_period_end:Boolean(subscription.cancel_at_period_end),
      updated_at:new Date().toISOString()
    },{onConflict:'workspace_id'});

  if(error)throw error;
}

export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).send('Method not allowed.');

  try{
    const [
      {default:Stripe},
      {createClient}
    ]=await Promise.all([
      import('stripe'),
      import('@supabase/supabase-js')
    ]);

    const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
    const body=await rawBody(req);
    const event=stripe.webhooks.constructEvent(
      body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const supabase=createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {auth:{persistSession:false,autoRefreshToken:false}}
    );

    if(
      event.type==='customer.subscription.created'||
      event.type==='customer.subscription.updated'||
      event.type==='customer.subscription.deleted'
    ){
      await updateWorkspace(supabase,event.data.object);
    }

    if(event.type==='checkout.session.completed'){
      const session=event.data.object;
      if(session.subscription){
        const subscription=await stripe.subscriptions.retrieve(session.subscription);
        await updateWorkspace(supabase,subscription);
      }
    }

    return res.status(200).json({received:true});
  }catch(error){
    console.error('Stripe webhook failed:',error);
    return res.status(400).send(`Webhook error: ${error.message}`);
  }
}
