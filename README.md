# PicPlanr Version 33.1 Combined Add-on

This update includes the Version 33 website brand analysis and the previously prepared social connection work.

## Version 33.1 review correction

- Keeps the full Account Strength panel only inside Account Review
- Fixes the page structure that allowed the diagnosis to appear on Upload Folder and other pages
- Labels handle-only analysis as a Preliminary Profile Review
- Explains that a typed Instagram handle does not provide genuine account data
- Uses Screenshot-Assisted Review when a current Instagram screenshot is uploaded
- Uses Connected Instagram Diagnosis only after Instagram is genuinely connected
- Leaves domain, Vercel, LinkedIn, Instagram, TikTok and publishing settings unchanged

# PicPlanr Version 33 Add-on

This update safely combines the existing Version 32 project, the LinkedIn connection start route that has not yet been uploaded to GitHub, and the new website brand-analysis experience.

## What this adds

- Real public website reading across the homepage and selected About, Services and Contact pages
- Evidence-led brand analysis using only website text and details supplied by the customer
- Brand summary, audience, personality, tone, selling points, content opportunities and quick wins
- Changing analysis messages without fake percentages
- Editable brand-profile results
- Local browser saving plus optional Supabase saving
- Three immediate content directions after saving
- Manual onboarding option for customers without a website
- The saved brand profile is passed into later image analysis, captions and content planning

## Existing work retained

- Instagram connection and account analysis
- LinkedIn connection start route
- TikTok connection start route
- Connected-account screen
- Content upload, grouping, caption choices, Stories and calendar
- Publishing queue and Vercel scheduled publishing settings

## Upload to GitHub

Upload the contents of this folder into the root of the existing PicPlanr repository, preserving the folder structure. This package is additive and does not change domain records or Vercel domain settings.

## Supabase database update

Run `supabase/schema.sql` in the Supabase SQL Editor. It uses `create table if not exists`, so it keeps the existing social and publishing tables and adds `brand_profiles` safely.

## Existing environment variables

Keep all existing Version 32 variables. The new website analysis uses:

- `OPENAI_API_KEY`
- Optional: `OPENAI_TEXT_MODEL` (defaults to `gpt-4.1-mini`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The LinkedIn start route still expects:

- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`
- Optional: `LINKEDIN_SCOPES`

## Important

This version includes the LinkedIn connection start route from the previous add-on, but full LinkedIn connection storage and publishing still require the matching callback route and LinkedIn product permissions.

## Version 33.2 page-isolation fix

- The full Account Strength review is now forcibly contained inside Account Review.
- Other workspace pages hide the review at both JavaScript and CSS levels.
- Asset version numbers were changed to prevent an older cached stylesheet or script being reused.


## Version 33.3 page isolation fix

- Account Strength panel is rendered only on Account Review.
- Review score is removed from the global header on all other workspace pages.
- CSS and JavaScript asset versions are cache-busted to 33.3.
