# Brand files (placeholders)

Every SVG in this folder is a placeholder drawn to the description in the brand kit: a rounded triangle inside an incomplete circle. Replace each with the supplied file of the same name when Levi Wilson delivers them.

| File | Used for |
| --- | --- |
| mark.svg | Header and loading state. Inlined by layout.js, coloured by `currentColor`, drawn on over 1200ms. |
| mark-slate.svg, mark-navy.svg, mark-cream.svg | Fixed colour marks for documents and email. |
| lockup-slate.svg, lockup-navy.svg, lockup-cream.svg | Mark with wordmark. |
| app-icon-slate.svg, app-icon-navy.svg, app-icon-cream.svg | Favicon and home screen icon (slate is the favicon). |

For the draw-on animation to keep working with the supplied `mark.svg`, each stroked shape needs `pathLength="100"` and a `data-draw` attribute, and colours should use `currentColor`. If the supplied mark is filled rather than stroked, the header shows it without the draw-on and nothing else changes.
