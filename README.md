# PicPlanr Integrated V5 — TikTok Video Publishing Foundation

This version adds TikTok alongside Instagram and LinkedIn.

## Added

- TikTok handle in onboarding
- TikTok Connected Account card
- TikTok readiness indicator
- TikTok Login Kit authorisation route
- TikTok video upload and scheduling support
- Video files accepted in the upload screen
- Video entries can be saved to the publishing queue
- TikTok provider adapter scaffold
- Database support for TikTok and video media

## Current TikTok limitation

The interface and backend foundation are included, but live TikTok publishing still requires:

1. A TikTok for Developers application
2. Login Kit enabled
3. Content Posting API enabled
4. Approved redirect addresses
5. Requested scopes approved
6. App review for Direct Post
7. A verified media domain or supported upload flow
8. User-facing TikTok privacy and interaction choices

Keep `PUBLISHING_TEST_MODE=true` until those requirements are approved.

## TikTok environment variables

- `TIKTOK_CLIENT_KEY`
- `TIKTOK_CLIENT_SECRET`
- `TIKTOK_REDIRECT_URI`
- `TIKTOK_SCOPES=user.info.basic,video.publish,video.upload`

## Existing environment variables

Keep all Version 4 variables, including:

- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BLOB_READ_WRITE_TOKEN` or `SUPABASE_STORAGE_BUCKET`
- `CRON_SECRET`
- `PUBLISHING_TEST_MODE=true`

## Database

Run the updated `supabase/schema.sql` in a new test database. If the previous schema is already installed, use a database migration rather than recreating production tables.
