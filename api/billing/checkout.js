import Stripe from 'stripe';
import {requireWorkspace,sendWorkspaceError} from '../_lib/authenticated-workspace.js';
import {PLANS,normalisePlan,planPriceEnvironmentKey} from '../_lib/plans.js';
import {ensureWorkspaceSubscription} from '../_lib/billing.js';

const stripeClient=()=>{
  if(!process.env.STRIPE_SECRET_KEY)throw new Error('Stripe is not configured.');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
};

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const {supabase,user,workspace}=await requireWorkspace(req);
    const requested=String(req.body?.plan||'').toLowerCase();

    if(!PLANS[requested]){
      return res.status(400).json({error:'Choose a valid PicPlanr plan.'});
    }

    const priceId=process.env[planPriceEnvironmentKey(requested)];
    if(!priceId){
      return res.status(503).json({error:`Stripe price for ${PLANS[requested].name} is not configured.`});
    }

    const stripe=stripeClient();
    const subscription=await ensureWorkspaceSubscription(supabase,workspace.id);
    let customerId=subscription.stripe_customer_id;

    if(!customerId){
      const customer=await stripe.customers.create({
        email:user.email||undefined,
        name:workspace.name,
        metadata:{workspace_id:workspace.id,user_id:user.id}
      });
      customerId=customer.id;

      const {error}=await supabase
        .from('workspace_subscriptions')
        .update({stripe_customer_id:customerId,updated_at:new Date().toISOString()})
        .eq('workspace_id',workspace.id);

      if(error)throw error;
    }

    const appUrl=String(process.env.PICPLANR_APP_URL||'https://picplanrapp.com').replace(/\/$/,'');
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',
      customer:customerId,
      line_items:[{price:priceId,quantity:1}],
      allow_promotion_codes:true,
      success_url:`${appUrl}/?billing=success`,
      cancel_url:`${appUrl}/?billing=cancelled`,
      client_reference_id:workspace.id,
      metadata:{workspace_id:workspace.id,plan_key:requested},
      subscription_data:{metadata:{workspace_id:workspace.id,plan_key:requested}}
    });

    return res.status(200).json({url:session.url});
  }catch(error){
    return sendWorkspaceError(res,error,'Stripe checkout could not be started.');
  }
}
