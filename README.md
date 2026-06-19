# PicPlanr Integrated V13 — Portrait-Only Story Ideas

This version ensures Story ideas only use portrait images.

## Changed

- image width and height are recorded during upload
- each image is classified as portrait, landscape or square
- Story ideas are created only from portrait images
- landscape and square images remain available for posts and carousels
- Story previews use a vertical 9:16 layout
- when no portrait images are uploaded, PicPlanr explains that a vertical image is required
- Story ideas reset correctly when a new folder is analysed

## Updated files

- `public/index.html`
- `public/styles-v13.css`
- `public/app-v13.js`

Upload the contents of this folder to the root of the existing GitHub repository and replace matching files.
Keep all current Vercel environment variables.
