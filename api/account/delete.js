import Stripe from 'stripe';
import {
  requireWorkspace,
  sendWorkspaceError
} from '../_lib/authenticated-workspace.js';

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    const confirmation=String(req.body?.confirmation||'').trim();

    if(confirmation!=='DELETE'){
      return res.status(400).json({
        error:'Type DELETE to confirm account deletion.'
      });
    }

    const {supabase,user,workspace}=await requireWorkspace(req);

    const {data:workspaceRow,error:workspaceError}=await supabase
      .from('workspaces')
      .select('id,owner_user_id')
      .eq('id',workspace.id)
      .single();

    if(workspaceError)throw workspaceError;

    const isOwner=workspaceRow.owner_user_id===user.id;

    const {count:memberCount,error:memberCountError}=await supabase
      .from('workspace_members')
      .select('*',{count:'exact',head:true})
      .eq('workspace_id',workspace.id);

    if(memberCountError)throw memberCountError;

    if(isOwner&&Number(memberCount||0)>1){
      return res.status(409).json({
        error:'This workspace still has other team members. Remove them or transfer ownership before deleting the account.'
      });
    }

    if(isOwner){
      const {data:subscription,error:subscriptionError}=await supabase
        .from('workspace_subscriptions')
        .select('stripe_subscription_id')
        .eq('workspace_id',workspace.id)
        .maybeSingle();

      if(subscriptionError)throw subscriptionError;

      if(
        subscription?.stripe_subscription_id&&
        process.env.STRIPE_SECRET_KEY
      ){
        const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);

        try{
          await stripe.subscriptions.cancel(
            subscription.stripe_subscription_id
          );
        }catch(error){
          if(error?.code!=='resource_missing'){
            throw error;
          }
        }
      }

      const {error:deleteWorkspaceError}=await supabase
        .from('workspaces')
        .delete()
        .eq('id',workspace.id);

      if(deleteWorkspaceError)throw deleteWorkspaceError;
    }else{
      const {error:membershipDeleteError}=await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id',workspace.id)
        .eq('user_id',user.id);

      if(membershipDeleteError)throw membershipDeleteError;
    }

    const {error:deleteUserError}=await supabase.auth.admin.deleteUser(
      user.id
    );

    if(deleteUserError)throw deleteUserError;

    return res.status(200).json({
      deleted:true
    });
  }catch(error){
    return sendWorkspaceError(
      res,
      error,
      'PicPlanr could not delete the account.'
    );
  }
}
