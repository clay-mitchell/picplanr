# PicPlanr Integrated V26 — Story Accuracy Fix

This version fixes inaccurate Story ideas.

## What changed

- each portrait image is checked separately
- the original image is sent directly to the Story accuracy step
- Story text must focus on the single main subject
- background details cannot replace the main subject
- a visible dog produces dog-focused Story text, not venue décor claims
- unsupported services, policies, events, offers and dates are blocked
- ambiguous images are skipped instead of receiving invented text
- Story options remain:
  - Quick update
  - Engagement
  - Call to action
- all Story text uses British English and no long dashes
- each Story displays an accuracy-checked badge

## Updated files

- `public/index.html`
- `public/styles-v26.css`
- `public/app-v26.js`
- `api/picplanr.js`

Upload the contents of this folder to the root of the existing GitHub repository and replace matching files.
Keep all current Vercel environment variables.
