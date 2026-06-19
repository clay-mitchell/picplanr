# PicPlanr Version 2 Test

This version adds:
- Business or Individual onboarding
- AI voice profile from supplied account details and pasted captions
- Account foundation review
- Folder or multi-image upload, up to 50 images
- Browser-side image compression
- Image-by-image analysis to avoid large request errors
- Automatic post grouping
- Three caption choices per post
- Evidence-based starting schedule recommendations

## Deploy to the existing GitHub/Vercel project
Replace the existing project files with the contents of this folder, commit the changes, and Vercel will redeploy.

Keep these Vercel environment variables:
- `OPENAI_API_KEY`
- Optional: `OPENAI_VISION_MODEL=gpt-4.1-mini`

## Important test limitation
The social connection fields are guided onboarding fields in this test. They do not yet sign into Instagram or LinkedIn or retrieve private analytics. Official platform login and permissions require separate integration work and approval. This test is for validating onboarding, folder analysis, grouping, caption quality and scheduling logic.

## Storage
This test compresses each image in the browser and sends one image per request, so it can be tested before Vercel Blob is connected. Vercel Blob should be added in the production version for saved libraries and permanent user projects.


## Version 2 onboarding update
The manual account-description and caption-sample fields have been removed. Users now enter social handles, a website and optional competitor/inspiration accounts. The current test build creates a first-pass profile from those details. Full automatic analysis of live posts, captions and performance will require official Instagram and LinkedIn account connections.
