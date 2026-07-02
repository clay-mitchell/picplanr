import {PLANS,normalisePlan} from './plans.js';

const PAID_ACTIVE_STATUSES=new Set(['active','trialing']);

function monthWindow(now=new Date()){
  const start=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1));
  const end=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()+1,1));
  return {start:start.toISOString(),end:end.toISOString()};
}

export async function ensureWorkspaceSubscription(supabase,workspaceId){
  const {data:existing,error}=await supabase
    .from('workspace_subscriptions')
    .select('*')
    .eq('workspace_id',workspaceId)
    .maybeSingle();

  if(error)throw error;
  if(existing)return existing;

  const {start,end}=monthWindow();
  const now=new Date().toISOString();

  const {data:created,error:createError}=await supabase
    .from('workspace_subscriptions')
    .insert({
      workspace_id:workspaceId,
      plan_key:'starter',
      status:'trialing',
      trial_started_at:now,
      current_period_start:start,
      current_period_end:end
    })
    .select('*')
    .single();

  if(createError)throw createError;
  return created;
}

export function isFreeTrialSubscription(subscription){
  return (
    String(subscription?.status||'')==='trialing' &&
    !subscription?.stripe_subscription_id
  );
}

export async function getWorkspaceBilling(supabase,workspaceId){
  const subscription=await ensureWorkspaceSubscription(supabase,workspaceId);
  const isTrial=isFreeTrialSubscription(subscription);
  const planKey=isTrial?'trial':normalisePlan(subscription.plan_key);
  const plan=PLANS[planKey];
  const {start,end}=monthWindow();

  const {data:usageRows,error:usageError}=await supabase
    .from('workspace_usage')
    .select('metric,quantity')
    .eq('workspace_id',workspaceId)
    .gte('period_start',start)
    .lt('period_start',end);

  if(usageError)throw usageError;

  const usage=Object.fromEntries(
    Object.keys(plan.limits).map(key=>[key,0])
  );

  for(const row of usageRows||[]){
    if(Object.prototype.hasOwnProperty.call(usage,row.metric)){
      usage[row.metric]=(usage[row.metric]||0)+Number(row.quantity||0);
    }
  }

  const trialCompleted=Boolean(subscription.trial_completed_at);
  const paidAccess=
    Boolean(subscription.stripe_subscription_id) &&
    PAID_ACTIVE_STATUSES.has(String(subscription.status||''));

  const accessAllowed=isTrial?!trialCompleted:paidAccess;

  return {
    subscription,
    planKey,
    plan,
    usage,
    accessAllowed,
    isTrial,
    trialCompleted,
    paidAccess,
    period:{start,end}
  };
}

export async function assertAndConsumeUsage({
  supabase,
  workspaceId,
  metric,
  quantity=1,
  metadata={}
}){
  const billing=await getWorkspaceBilling(supabase,workspaceId);

  if(billing.isTrial&&billing.trialCompleted){
    const error=new Error(
      'Your one-time free trial has been completed. Choose a plan to continue.'
    );
    error.statusCode=402;
    error.code='free_trial_completed';
    error.plan='trial';
    throw error;
  }

  if(billing.isTrial&&metric==='scheduled_posts'){
    const error=new Error(
      'Your free trial includes the schedule preview, but a subscription is required to save or schedule posts.'
    );
    error.statusCode=402;
    error.code='subscription_required_to_schedule';
    error.plan='trial';
    throw error;
  }

  if(!billing.accessAllowed){
    const error=new Error(
      'Your subscription is not active. Choose a plan to continue.'
    );
    error.statusCode=402;
    error.code='subscription_inactive';
    throw error;
  }

  const limit=Number(billing.plan.limits[metric]);

  if(!Number.isFinite(limit)){
    const error=new Error(`No limit is configured for ${metric}.`);
    error.statusCode=500;
    throw error;
  }

  const used=Number(billing.usage[metric]||0);
  const requested=Math.max(0,Number(quantity)||0);

  if(used+requested>limit){
    const error=new Error(
      billing.isTrial
        ?'You have reached the allowance for your one-time free trial.'
        :`You have reached the ${billing.plan.name} plan limit for this feature.`
    );
    error.statusCode=402;
    error.code=billing.isTrial?'free_trial_limit_reached':'plan_limit_reached';
    error.metric=metric;
    error.used=used;
    error.limit=limit;
    error.plan=billing.planKey;
    throw error;
  }

  const {error}=await supabase.rpc('consume_workspace_usage',{
    target_workspace_id:workspaceId,
    usage_metric:metric,
    usage_quantity:requested,
    usage_metadata:metadata
  });

  if(error)throw error;

  return {
    plan:billing.planKey,
    metric,
    used:used+requested,
    limit,
    remaining:Math.max(0,limit-used-requested)
  };
}

export function sendBillingError(
  res,
  error,
  fallback='This action could not be completed.'
){
  const status=Number(error?.statusCode)||500;

  return res.status(status).json({
    error:error?.message||fallback,
    code:error?.code||'billing_error',
    metric:error?.metric,
    used:error?.used,
    limit:error?.limit,
    plan:error?.plan,
    upgradeRequired:status===402
  });
}
