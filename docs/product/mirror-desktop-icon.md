# Mirror Desktop Icon

**Status:** approved for Mirror Desktop

## Design intent

The icon represents a mirror as a field of encounter rather than a literal reflected face. Two violet glass fields meet along a subtle curved axis. A point of light at the center marks recognition, while the oval frame keeps the symbol legible at small macOS icon sizes.

The Navigator accepted this direction as the canonical Mirror Desktop artwork on 2026-09-04.

The stable source is `src-tauri/icons/icon.svg`. The development variant is `src-tauri/icons/dev/icon.svg` and preserves the explicit `DEV` badge. Their PNG counterparts are generated at 512 by 512 pixels for the current Tauri bundle configuration.

## Image-generation prompt

```text
Create a premium macOS application icon for a product named Mirror Desktop. The central symbol must unmistakably evoke a mirror, but avoid a literal human face, selfie camera, bathroom mirror, eye, letter M, infinity symbol, nautilus shell or spiral. Show an elegant vertical oval mirror or reflective portal centered inside a dark rounded-square macOS icon. Divide the glass into two subtly different violet reflective fields that meet along a delicate, slightly curved vertical axis, suggesting self and reflection without depicting a person. Place one restrained point of white light at the exact center as a symbol of recognition and presence. Use a deep plum and near-black background, a luminous pearl-lavender frame, soft violet glass, gentle depth, controlled highlights and refined contrast. The feeling should be contemplative, sovereign, quiet and precise, not mystical kitsch, cyberpunk, glossy corporate 3D or ornamental fantasy. Keep the silhouette bold and readable at 32 px. No words, letters, badges, gradients with rainbow colors, mockup, device frame or surrounding scene. Front-facing, centered, symmetrical composition, generous internal margin, production-quality vector aesthetic. Deliver a clean 1024 x 1024 master with transparent outer canvas and, if supported, editable SVG paths.
```

For a development-channel variation, preserve the artwork and add a compact violet `DEV` badge in the lower-right corner without covering the mirror's central light.

## Review criteria

The candidate passes visual review when it reads as a mirror at Dock size, remains distinct from the inherited Nautilus spiral, preserves a calm violet family and keeps the development channel unmistakable without changing the stable symbol.
