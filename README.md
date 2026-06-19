# PicPlanr Integrated V14 — AI Story Updates

This version improves the Story workflow.

## Changed

- Post and carousel ideas now appear before Story ideas
- Stories are lower priority and appear underneath the main content ideas
- Story ideas are generated in a separate AI request for reliability
- Only portrait image analyses are sent to the Story strategist
- Stories use short overlay phrases instead of feed-style captions
- Three Story-specific choices:
  - Quick update
  - Engagement
  - Call to action
- Story suggestions focus on keeping customers or followers informed
- AI is instructed not to invent offers, dates, events, availability or business details
- Safe browser-generated fallback ideas remain available if the Story AI request fails

## Updated files

- `public/index.html`
- `public/styles-v14.css`
- `public/app-v14.js`
- `api/picplanr.js`

Upload the contents of this folder to the root of the existing GitHub repository and replace matching files.
Keep all current Vercel environment variables.
