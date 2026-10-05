# Element Bound fonts

Self-hosted so the Content-Security-Policy needs no third-party font or style
hosts. Both fonts are licensed under the SIL Open Font License 1.1 (the
`OFL-*.txt` files in this folder must stay alongside the fonts).

| File | Family | Weights | Use |
|---|---|---|---|
| `cinzel-latin-wght.woff` | Cinzel (variable) | 600–800 | Names, numbers, headings (`--eb-font-display`) |
| `nunito-sans-latin-wght.woff` | Nunito Sans (variable) | 400–800 | UI text, card effects (`--eb-font-ui`) |

Source: `google/fonts` on GitHub, commit `23e54b5` (2026-09-24):
`ofl/cinzel/Cinzel[wght].ttf` and `ofl/nunitosans/NunitoSans[YTLC,opsz,wdth,wght].ttf`.

Build: `fontTools` instancer limited the weight axis to the ranges above
(Nunito Sans also pinned `opsz` to 12 and its `YTLC`/`wdth` axes to their
defaults), then subset to Latin, Latin-1, general punctuation (including `·`
and `−`), arrows and geometric shapes, saved as WOFF. Neither font includes
`→` (U+2192); it falls back to the system font.

Example `@font-face` (Phase 1 adds this to `css/tokens.css`):

```css
@font-face{font-family:"Cinzel";src:url("../assets/fonts/cinzel-latin-wght.woff") format("woff");font-weight:600 800;font-display:swap}
@font-face{font-family:"Nunito Sans";src:url("../assets/fonts/nunito-sans-latin-wght.woff") format("woff");font-weight:400 800;font-display:swap}
```
