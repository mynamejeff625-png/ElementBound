# Asset Extraction Checkpoint

Source: stable Alpha 0.8.53 single-file build supplied by the user.

Validated extraction map:

| Asset | Dimensions | Bytes | SHA-256 |
|---|---:|---:|---|
| assets/images/game-background.png | 711×1536 | 1,352,212 | de14f0ce02bf4a34b18e5a7a35efc25531624435fe53fae883b719d933536325 |
| assets/images/atmosphere-overlay.png | 711×1536 | 1,402,828 | 0c2280786476cdea518054cca150eeaa4e09350a93e03ca58bd865ff3eb3cc6b |
| assets/images/elementbound-logo.png | 1024×1024 | 922,243 | 1e85171cb3c18fac8f5bfd181ced4782b1bc77cd1303d45fbafda73bab0fda63 |

## Validation results

- Exactly 3 embedded PNG data URIs were identified.
- All 3 decoded as valid PNG files.
- Replacing only those data URIs with external paths reduces the HTML from ~5.14 MB to ~234 KB.
- The transformed document retains 13 style tags and 2 script tags.
- No embedded image data URIs remain after extraction.
- A round-trip test re-embedded the extracted PNG bytes into the transformed HTML and reproduced the original stable source exactly.
- Stable source SHA-256 after exact round-trip: acaac2b5bc2ef96742d6e395e75436507790855d470c3c0e94923065470bec86.

## Safety gate

Do not replace the branch index.html until all three binary assets and the transformed HTML can be committed atomically. This prevents a deployable commit with broken image paths.

No gameplay, balance, AI, initiative, DOM, CSS, touch, or visual-effect logic was changed during this checkpoint.
