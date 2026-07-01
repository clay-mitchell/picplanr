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
      video_uploads:5,
      video_storage_bytes:5*1024*1024*1024,
      team_members:1,
      caption_regenerations:3
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
      video_uploads:30,
      video_storage_bytes:25*1024*1024*1024,
      team_members:3,
      caption_regenerations:10
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
      video_uploads:100,
      video_storage_bytes:100*1024*1024*1024,
      team_members:10,
      caption_regenerations:25
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
