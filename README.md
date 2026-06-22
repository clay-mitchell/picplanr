# PicPlanr Integrated V28 — Story Caption Fix

This version fixes Story ideas that displayed the image and instructions but no caption choices.

## Cause

The Story response did not always use the exact `text` field expected by the interface. The system also reused the post-caption normaliser, which renamed Story options incorrectly.

## Fixed

- dedicated Story caption normaliser
- exact Story option labels:
  - Quick update
  - Engagement
  - Call to action
- accepts Story wording returned as text, caption, copy, content, value, phrase or overlay_text
- generates safe subject-based fallback text when the response is incomplete
- Story caption cards can no longer render empty
- the AI now receives an exact required JSON structure
- the AI is no longer allowed to return an empty Story text array

## Updated files

- `public/index.html`
- `public/styles-v28.css`
- `public/app-v28.js`
- `api/picplanr.js`

Upload the contents of this folder to the root of the existing GitHub repository and replace matching files.
Keep all existing Vercel environment variables.
