# PicPlanr Integrated V18 — Group Validation Fix

This version fixes the error:

`group is not defined`

## Cause

The accuracy-validation route was using the proposed content group but the server had not included `group` when reading the request body.

## Fixed

- the API now reads the `group` value correctly
- validation requests now return a clear message if the group is missing
- all Version 17 loading states remain included

## Updated files

- `public/index.html`
- `public/styles-v18.css`
- `public/app-v18.js`
- `api/picplanr.js`

Upload the contents of this folder to the root of the existing GitHub repository and replace matching files.
Keep all existing Vercel environment variables.
