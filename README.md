# PicPlanr Integrated V7 — Correct Dates and Monthly Distribution

This update fixes two calendar problems.

## Fixed

1. The weekly view previously matched posts by weekday only.
   This made posts from other weeks appear inside the same visible week.
   It now matches the full date.

2. Scheduling previously started at the beginning of the selected month.
   It now starts from tomorrow and uses the next 30 days, so no post is
   scheduled in the past.

## Scheduling rules

- Content is spread over the next 30 days
- The target is an even number of posts across approximately four weeks
- Maximum 4 posts in any week
- AI-recommended days and times are used where they fit
- The month calendar opens on the month containing the first scheduled post

## New front-end files

- `public/index.html`
- `public/styles-v7.css`
- `public/app-v7.js`

Upload the contents of this folder to the root of the existing GitHub repository.
Keep all current Vercel environment variables.
