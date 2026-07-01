import Stripe from 'stripe';
import {requireWorkspace,sendWorkspaceError} from '../_lib/authenticated-workspace.js';
import {ensureWorkspaceSubscription} from '../_lib/billing.js';

export default async function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({error:'Method not allowed.'});
  }

  try{
    if(!process.env.STRIPE_SECRET_KEY)throw new Error('Stripe is not configured.');
    const {supabase,workspace}=await requireWorkspace(req);
    const subscription=await ensureWorkspaceSubscription(supabase,workspace.id);

    if(!subscription.stripe_customer_id){
      return res.status(400).json({error:'No Stripe billing account exists for this workspace yet.'});
    }

    const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
    const appUrl=String(process.env.PICPLANR_APP_URL||'https://picplanrapp.com').replace(/\/$/,'');
    const session=await stripe.billingPortal.sessions.create({
      customer:subscription.stripe_customer_id,
      return_url:`${appUrl}/?view=billing`
    });

    return res.status(200).json({url:session.url});
  }catch(error){
    return sendWorkspaceError(res,error,'Billing management could not be opened.');
  }
}
