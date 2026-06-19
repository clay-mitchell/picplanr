# PicPlanr Integrated V6 — Balanced Monthly Scheduling

This version changes the calendar scheduling rules.

## New scheduling behaviour

- Approved content is spread across the full selected month
- No week can contain more than 4 posts
- The scheduler aims for an even number of posts each week
- Preferred AI-recommended days and times are still used where possible
- Similar posts are not all placed into the first week
- The weekly preview opens on the first scheduled week

## Example

Seven approved posts will normally be spread across approximately four weeks instead of all appearing in one week.

## Upload

Upload the contents of this folder to the root of the existing GitHub repository.

The new cache-busted front-end files are:

- `public/index.html`
- `public/styles-v6.css`
- `public/app-v6.js`

Keep all existing Vercel environment variables.
