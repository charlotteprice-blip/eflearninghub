# Brand files

These are the Executive Frame brand pack's own files (version 1.1, 11 November 2026, Levi Wilson), copied in unchanged. Always use them as supplied: never redraw, recolour, stretch or crop them. The rules are in the pack's guidelines.

| File | What it is | Used for |
| --- | --- | --- |
| `ef-lockup-slate.svg` | The horizontal lockup, slate | The header of every page and of the viewer, 150px wide (the minimum is 140px). "Learning Hub" sits beside it as plain text after a hairline. |
| `ef-mark-slate.svg` | The mark alone, slate | The page header for a logged in member on a phone, 28px (the minimum is 16px). |
| `ef-lockup-warm-white.svg`, `ef-mark-warm-white.svg` | The same in warm white | On navy or slate only. Not used in the app yet. |
| `ef-lockup-stacked-*.svg` | The stacked lockup with the brand line | Covers and splash screens, 360px wide or more. Not used in the app yet. |
| `ef-lockup-on-*.svg`, `ef-mark-on-*.svg` | The logo on a sky, navy or warm white field | Tiles and documents. Not used in the app. |
| `ef-mark-display-*.svg` | The display drawing, a thinner loop | 240px and above only. Not used in the app. |
| `ef-wordmark-*.svg` | The wordmark alone | Not used in the app. |
| `app-icon/` | The app icon (warm white on navy), its light version and a square version, as SVG and PNG at 180 and 512px | Home screen icons. |
| `mark.svg` | The mark for inlining | Loading states, where it draws on once. Written by `npm run tokens` from the loop and triangle paths in `brand/ef-tokens.json`: do not edit it. Colour is `currentColor`. |

The favicons are at the top of `public/`, where the pack's head snippet expects them: `favicon.svg` (which turns warm white in dark mode), `favicon.ico`, the PNG favicons, `apple-touch-icon.png`, the 2 `android-chrome` icons and `site.webmanifest`. Every page carries the pack's head snippet. Nothing loads from another address.

Logo colours: slate on sky, warm white and white; warm white on navy and slate. Never any other colour, never in a container, never beside an icon, never below its minimum size. Keep a clear space of 0.4 of the mark's box on every side.

When a new brand pack arrives: replace these files with the new ones of the same names, replace `brand/ef-tokens.json`, and run `npm run tokens`.
