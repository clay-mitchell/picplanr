# PicPlanr Integrated V17 — Loading States

This update adds visible feedback when a longer action is running.

## Added

- full-screen loading overlay
- animated spinner
- action-specific progress messages
- loading spinner inside the active button
- temporary button disabling to prevent repeated clicks

## Loading feedback added to

- Analyse account
- Run account review
- Build or rebuild schedule
- Save publishing queue

The image-analysis screen already keeps its detailed progress bar and image count.

## Updated files

- `public/index.html`
- `public/styles-v17.css`
- `public/app-v17.js`

Upload the contents of this folder to the root of the existing GitHub repository and replace matching files.
Keep all existing Vercel environment variables.
