# PicPlanr Integrated V4 — Connected Accounts and Automatic Publishing Foundation

This version keeps the full PicPlanr workflow and adds the next product layer:

- Connected Accounts screen
- Instagram and LinkedIn connection controls
- Publishing-readiness checklist
- Save approved calendar posts to a publishing queue
- Scheduled-publishing database schema
- Vercel scheduled job route
- Test mode for checking the workflow without publishing publicly
- Post publishing statuses

## Important

The interface and publishing infrastructure are included, but real social posting cannot be activated until:

1. A Supabase project is connected
2. Image storage is connected
3. A Meta developer application is created and approved
4. A LinkedIn developer application is created and approved
5. Secure user authentication and token encryption are connected

This is required by the social platforms; it cannot be bypassed by uploading code alone.

## Environment variables

Existing:

- `OPENAI_API_KEY`

Publishing foundation:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_STORAGE_BUCKET` or `BLOB_READ_WRITE_TOKEN`
- `CRON_SECRET`
- `PUBLISHING_TEST_MODE=true`

Instagram later:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_REDIRECT_URI`

LinkedIn later:

- `LINKEDIN_CLIENT_ID`
- `LINKEDIN_CLIENT_SECRET`
- `LINKEDIN_REDIRECT_URI`
- `LINKEDIN_SCOPES`

## Database setup

Run `supabase/schema.sql` inside the Supabase SQL editor.

## Test mode

Keep `PUBLISHING_TEST_MODE=true` while developing. Due posts will move to Published without being sent to a public social account.

Set it to `false` only after approved platform connections and real publishing adapters are active.
