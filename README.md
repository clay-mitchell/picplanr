# PicPlanr Integrated V30 — Natural Social Captions

This version changes the caption engine so captions sound like social posts rather than descriptions of photographs.

## Changed

- captions no longer repeat everything visible in the image
- Natural captions are short and conversational
- Engagement captions ask one simple relevant question
- Goal-led captions connect gently to the account goal
- literal openings such as “A closer look at” and “This image shows” are blocked
- artificial phrases such as showcase, elevate, stunning, ambience and perfect backdrop are discouraged
- captions are limited to 4 to 22 words
- titles are written as content angles rather than image descriptions
- standalone fallback posts now use natural subject-aware wording
- British English and no long dashes remain enforced
- caption editing remains available

## Updated files

- `public/index.html`
- `public/styles-v30.css`
- `public/app-v30.js`
- `api/picplanr.js`

Upload the contents of this folder to the root of the existing GitHub repository and replace matching files.
Keep all current Vercel environment variables.
