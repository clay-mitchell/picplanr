# PicPlanr Integrated V21 — Profile Reference Fix

This version fixes the error:

`Can't find variable: renderProfileReference`

## Cause

The profile reference functions were accidentally placed inside the account context function, so the rest of the application could not access them.

## Fixed

- `renderProfileReference` is now available globally
- account analysis can complete normally
- the profile reference preview still updates after account analysis
- all Version 20 profile preview features remain included

## Updated files

- `public/index.html`
- `public/styles-v21.css`
- `public/app-v21.js`

Upload the contents of this folder to the root of your existing GitHub repository and replace matching files.
Keep all existing Vercel environment variables.
