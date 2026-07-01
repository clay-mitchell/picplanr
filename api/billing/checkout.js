import Stripe from 'stripe';
import {requireWorkspace} from '../_lib/authenticated-workspace.js';
import {PLANS,planPriceEnvironmentKey} from '../_lib/plans.js';
import {ensureWorkspaceSubscription} from '../_lib/billing.js';

function fail(res,status,message,stage,details=''){
  return res.status(status).json({
    error:message,
    stage,
    details
  });
}

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return fail(res,405,'Method not allowed.','request');
  }

  let stage='authentication';

  try{
    const {supabase,user,workspace}=await requireWorkspace(req);

    stage='plan validation';
    const requested=String(req.body?.plan||'').trim().toLowerCase();

    if(!PLANS[requested]){
      return fail(res,400,'Choose a valid PicPlanr plan.',stage);
    }

    stage='environment variables';
    const secretKey=String(process.env.STRIPE_SECRET_KEY||'').trim();
    const priceKey=planPriceEnvironmentKey(requested);
    const priceId=String(process.env[priceKey]||'').trim();

    if(!secretKey){
      return fail(
        res,
        503,
        'STRIPE_SECRET_KEY is missing from the active Vercel deployment.',
        stage
      );
    }

    if(!secretKey.startsWith('sk_test_')&&!secretKey.startsWith('sk_live_')){
      return fail(
        res,
        503,
        'STRIPE_SECRET_KEY does not look like a valid Stripe secret key.',
        stage
      );
    }

    if(!priceId){
      return fail(
        res,
        503,
        `${priceKey} is missing from the active Vercel deployment.`,
        stage
      );
    }

    if(!priceId.startsWith('price_')){
      return fail(
        res,
        503,
        `${priceKey} must contain a Stripe Price ID beginning with price_.`,
        stage
      );
    }

    const stripe=new Stripe(secretKey);

    stage='workspace subscription';
    const subscription=await ensureWorkspaceSubscription(supabase,workspace.id);
    let customerId=subscription.stripe_customer_id;

    stage='Stripe customer';
    if(!customerId){
      const customer=await stripe.customers.create({
        email:user.email||undefined,
        name:workspace.name||'PicPlanr customer',
        metadata:{
          workspace_id:String(workspace.id),
          user_id:String(user.id)
        }
      });

      customerId=customer.id;

      const {error:updateError}=await supabase
        .from('workspace_subscriptions')
        .update({
          stripe_customer_id:customerId,
          updated_at:new Date().toISOString()
        })
        .eq('workspace_id',workspace.id);

      if(updateError)throw updateError;
    }

    stage='Stripe Checkout';
    const appUrl=String(
      process.env.PICPLANR_APP_URL||'https://picplanrapp.com'
    ).trim().replace(/\/$/,'');

    const session=await stripe.checkout.sessions.create({
      mode:'subscription',
      customer:customerId,
      line_items:[{price:priceId,quantity:1}],
      allow_promotion_codes:true,
      success_url:`${appUrl}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${appUrl}/?billing=cancelled`,
      client_reference_id:String(workspace.id),
      metadata:{
        workspace_id:String(workspace.id),
        plan_key:requested
      },
      subscription_data:{
        metadata:{
          workspace_id:String(workspace.id),
          plan_key:requested
        }
      }
    });

    if(!session.url){
      return fail(
        res,
        502,
        'Stripe created a Checkout Session without a redirect URL.',
        stage
      );
    }

    return res.status(200).json({url:session.url});
  }catch(error){
    console.error('PicPlanr Stripe checkout failed', {
      stage,
      type:error?.type,
      code:error?.code,
      message:error?.message
    });

    const status=Number(error?.statusCode)||400;
    const safeMessage=
      error?.raw?.message||
      error?.message||
      'Stripe checkout could not be started.';

    return fail(res,status,safeMessage,stage,error?.code||error?.type||'');
  }
}
