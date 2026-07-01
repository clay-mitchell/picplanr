import {requireWorkspace,sendWorkspaceError} from '../_lib/authenticated-workspace.js';
import {getWorkspaceBilling} from '../_lib/billing.js';
import {PLANS} from '../_lib/plans.js';

export default async function handler(req,res){
  if(req.method!=='GET'){
    res.setHeader('Allow','GET');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const {supabase,workspace}=await requireWorkspace(req);
    const billing=await getWorkspaceBilling(supabase,workspace.id);

    return res.status(200).json({
      plan:{
        key:billing.planKey,
        name:billing.plan.name,
        priceLabel:billing.plan.priceLabel,
        description:billing.plan.description,
        limits:billing.plan.limits
      },
      usage:billing.usage,
      subscription:{
        status:billing.subscription.status,
        cancelAtPeriodEnd:Boolean(billing.subscription.cancel_at_period_end),
        currentPeriodStart:billing.subscription.current_period_start,
        currentPeriodEnd:billing.subscription.current_period_end,
        hasStripeCustomer:Boolean(billing.subscription.stripe_customer_id)
      },
      plans:PLANS
    });
  }catch(error){
    return sendWorkspaceError(res,error,'PicPlanr could not load subscription usage.');
  }
}
