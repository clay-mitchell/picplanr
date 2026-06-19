# PicPlanr Accuracy Upgrade

This build upgrades the caption workflow so it is more accurate and less likely to invent details.

## Main changes

- Images are analysed one by one
- Each image returns supported facts with confidence levels
- The caption layer only uses those supported facts
- Risky or unsupported claims are filtered out
- Groups are created after the image analyses are complete
- Each group gets three caption options

## Environment variable

Make sure Vercel still has:

`OPENAI_API_KEY`

## Files to upload

Upload the contents of this folder to the root of the existing GitHub repository.

## Notes

This is a stricter test build. It is designed to be more conservative, which is better than making unsupported claims.
