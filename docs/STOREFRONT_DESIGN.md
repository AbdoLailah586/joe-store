# Storefront design refresh

The storefront keeps a light, warm paper background, dark olive typography, terracotta actions and soft category colors. Product imagery, prices, availability, review counts, uncertainty notices and warranty durations still come from the catalog. The hero uses existing illustrative category imagery without attaching a model or price to those pictures. Administrator-created campaigns remain available below the category collection and use manual navigation.

## Motion and component sources

- [GSAP](https://gsap.com/docs/v3/), [SplitText](https://gsap.com/docs/v3/Plugins/SplitText/) and [React integration](https://github.com/greensock/react): the motion module loads separately. Headings reveal by lines after fonts settle; Arabic characters are never separated. Scroll entrances run once. `useGSAP` and `matchMedia` revert timelines, splits and scroll triggers when the page changes or reduced-motion is enabled.
- [React Bits SpotlightCard](https://github.com/DavidHDev/react-bits/tree/main/src/ts-tailwind/Components/SpotlightCard): adapted for light collection tiles. It uses local fine-pointer tracking, has no continuous animation loop, and turns off for touch or reduced motion. The upstream license is retained in `third-party/REACT_BITS_LICENSE.md`.
- The video’s last name was unclear. [21st.dev](https://21st.dev/) matches its description of a component registry for coding assistants; it informed the component-based layout approach. No unverified package named “Twinefest” was installed.

All content remains readable and operable before the optional motion module loads. The PWA build includes the additional motion chunk in its app-shell cache. No API, account or checkout caching behavior changed.

## Validation

- Production build and the existing 96 automated checks.
- Read-only local production preview with the complete public catalog: desktop, mobile, Arabic and English; category navigation, header search, stock-disabled actions, product navigation, cart, mobile menu and install instructions.
- No real orders, payments, account changes or inventory writes are made by the local preview.
