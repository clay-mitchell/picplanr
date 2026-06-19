# PicPlanr Integrated V3

This build keeps the complete Version 2 flow and replaces the calendar with a more visual layout.

## Calendar improvements

- “This week’s schedule” appears first
- Each post shows its real image
- Posting time, platform, title and caption preview are visible
- Full monthly calendar appears below
- Clicking a post opens the full image and editable caption
- Google Calendar export remains included

## Upload structure

Upload the contents of this folder to the root of the existing GitHub repository.

Important front-end files:

- `public/index.html`
- `public/styles-v3.css`
- `public/app-v3.js`

The versioned file names prevent the browser or Vercel from continuing to load the previous cached calendar.

Keep the existing Vercel environment variable:

`OPENAI_API_KEY`
