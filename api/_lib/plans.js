export const PLAN_ORDER=['starter','business','pro'];

export const PLANS={
  starter:{
    key:'starter',
    name:'Starter',
    pricePence:1900,
    priceLabel:'£19',
    description:'For individuals, creators and small businesses.',
    limits:{
      image_analyses:250,
      website_analyses:1,
      scheduled_posts:25,
      connected_accounts:1,
      team_members:1,
    }
  },
  business:{
    key:'business',
    name:'Business',
    pricePence:4900,
    priceLabel:'£49',
    description:'For active businesses managing regular content.',
    limits:{
      image_analyses:750,
      website_analyses:5,
      scheduled_posts:100,
      connected_accounts:4,
      team_members:3,
    }
  },
  pro:{
    key:'pro',
    name:'Pro',
    pricePence:9900,
    priceLabel:'£99',
    description:'For agencies, larger brands and content teams.',
    limits:{
      image_analyses:2000,
      website_analyses:15,
      scheduled_posts:300,
      connected_accounts:10,
      team_members:10,
    }
  }
};

export function normalisePlan(value){
  const key=String(value||'starter').toLowerCase();
  return PLANS[key]?key:'starter';
}

export function planPriceEnvironmentKey(plan){
  return `STRIPE_PRICE_${String(plan||'').toUpperCase()}`;
}
