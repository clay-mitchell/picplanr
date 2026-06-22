# PicPlanr Integrated V27 — Missing Captions Fix

This version fixes blank caption cards after the accuracy check.

## Cause

The accuracy checker sometimes returned caption objects using fields such as `caption`, `content` or `copy` instead of the expected `text` field. The interface therefore rendered empty cards even though the artificial intelligence had returned wording.

## Fixed

- accepts caption text from several common response fields
- accepts plain caption strings
- standardises every option to:
  - Natural
  - Engagement
  - Goal-led
- falls back to the original draft captions when the accuracy response is incomplete
- removes groups only when three usable caption options genuinely cannot be recovered
- gives the artificial intelligence an exact required caption structure
- instructs the accuracy checker to rewrite inaccurate captions instead of returning blanks

## Updated files

- `public/index.html`
- `public/styles-v27.css`
- `public/app-v27.js`
- `api/picplanr.js`

Upload the contents of this folder to the root of the existing GitHub repository and replace matching files.
Keep all current Vercel environment variables.
