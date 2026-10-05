# True Sizes Nightly

Nightly preserves the historical True Sizes interface and adds focused safeguards.
The stable site and original detector repository are untouched.

## Maintained Sources

`index.html`, `style.css` and `script.js` retain the original composition and
assets. `integration.js` supplies the historical consumer's corrected measurement,
storage and lifecycle behavior. Optional `progress.mjs` consumes the GPT SDK's pure
contracts and reads UA-CH model only on command. The former generic `app.css` and
`app.mjs` remain as historical implementation evidence, not loaded by the root.
The legacy bundle loads asynchronously; optional SDK modules are inserted only
after the classic controls initialize. Neither download is a manual-workflow gate.

`gpt-engine/` is a manifest-owned SDK distribution from GPT-device-data-detector;
its guide, source notice, MPL license and icon notices are included. Never hand-edit
copied SDK modules. The separately versioned `gpt/` laboratory is unchanged.
CNAME, Pages deployment configuration and the inherited bundle remain unchanged.

## Measurement Boundaries

The initial frame and screen diagonal choices are explicitly nominal estimates.
Light legacy hints retain the old catalogue's family and resolution declarations,
including old devices; they do not run GPU/Renderer/battery probes. A tuple can
match several models, and does not bind the active panel. Legacy algorithms remain
in the preserved bundle; its automatic deviceDetection() is not called.

Manual alignment adjusts a direct CSS/cm ratio and checks both object edges.
It assumes isotropic mapping, not two independent axis measurements, and never
fabricates a new physical diagonal. One visible starting draft may be seeded to
fit the window; entered metric objects are never reduced to fit. Invalid,
oversized or transformed frames are masked rather than left stale. Centimeter /
inch conversion preserves the requested dimensions using exactly 2.54 cm per inch.

Screen tuple, DPR, visual scale, native screen changes and transformed geometry
require reference review. Ordinary layout resize or scroll alone does not erase
an aligned reference. Optional segment/posture checks require the SDK. Hidden
contexts and persisted-page restoration require review. A swap between physically
different panels with identical exposed contexts can remain undetectable.
Human alignment and browser software tests do not establish physical accuracy.

## Preview And Verification

Use Node 22+ with `node preview.mjs 8788`; open http://127.0.0.1:8788/.
The preview only serves tracked app assets and reviewed SDK/adapter entries,
excluding private AGENTS and Git metadata. In the canonical GPT checkout:

- `npm test` and `npm run test:types`: engine contracts and consumer declarations.
- `npm run build:sdk`, `npm run copy:nightly`: protected SDK generation/copy.
- `npm run test:nightly:heritage -- /absolute/output/path`: current consumer QA.
- `NIGHTLY_URL=https://dev.truesiz.es/ npm run test:nightly:heritage -- /absolute/output/path`: public smoke checks without adversarial fixtures.

The older test:nightly/adversarial scripts target the superseded generic app, not
the restored root. Current QA uses isolated Chromium, Firefox and WebKit profiles;
mobile emulation and synthetic contexts are not hardware/physical validation.

`tests/ui-regressions.mjs` checks the original author wordmark and settings panel
on desktop, small portrait and landscape layouts in Chromium, Firefox and WebKit.
Run it with Node and an external Playwright installation, setting
`PLAYWRIGHT_MODULE` to its module path when needed; pass an output directory outside
the checkout. Set `NIGHTLY_URL=https://dev.truesiz.es/` for the same public checks.
The settings panel is bounded by the actual content area and resizes while open;
its scrollable controls do not change the reference scale.

## Storage And Privacy

Only `truesizes:heritage:profiles:v1` and `truesizes:heritage:preferences:v1` are
written or reset by this consumer. Reference profiles are bounded proposals with
exposed context, never serials, machine labels or unique display IDs. Reloading a
profile prepares its scale but requires a new alignment. Historical `screen N`
and `appData` are read-only proposals/preferences; unrelated or corrupt keys do
not stop manual measurement. Earlier GPT profile/preference keys remain untouched.
Prefixes are not a same-origin security sandbox. No raw UA, optional model or
GPU result is persisted. Storage refusal leaves the live manual workflow usable.

## Historical Documentation

The text below describes the original product. Its automatic calibration and
multi-screen claims are not physical validation of this experimental integration.

truesiz.es
==============

# Description

[truesiz.es](https://truesiz.es) is a web tool to display real size dimensions in your browser.

Its main strengths are :
- **self-calibration utilities** (with device identification, and when impossible at least device type identification)
- **manual calibration** with 2 modes : by screen size entry or by fitting a frame with an usual object, like a credit card (manual calibration is of course automatically saved)
- **multiscreen support** with automatic screen change detection, already calibrated screen detection and screen rotation detection
- **mobile compatibility** (installable as a Progressive Web App, with a responsive interface)
- plenty of practical functions : **graduations**, **fullscreen mode**, **light/dark mode**

# About the tool

## Distributions

[truesiz.es](https://truesiz.es) is available under two distributions :
- [truesiz.es](https://github.com/arnaud-engineer/truesiz.es) : last stable version (available at [truesiz.es](https://truesiz.es))
- [truesiz.es nightly](https://github.com/arnaud-engineer/truesiz.es-nightly) : last dev versions, probably broken, but with the very last functionnalities (available at [dev.truesiz.es](https://dev.truesiz.es))

## Usage

As an user, you can simply go on [truesiz.es](https://truesiz.es). If you want your own instance, you just need to install the web server of your choice and add the sources to your server repository.

## Technical Stack

This PWA mainly uses Vanilla JS, HTML and CSS. It only has 2 JS librairies dependencies, included in the sources (`/lib`) :
- [device-data-detector](https://github.com/arnaud-engineer/device-data-detector) : it allows to detect device/device type and return various datas such as name, screen size, … This library has been especially crafted for [truesiz.es](https://truesiz.es).
- [51 degress’s Renderer](https://github.com/51degrees/renderer) : a really inventive tool that allows to get around Apple GPU obfuscation on iOS.

# Contributing

## It’s a free project

This is a free/libre PWA under Mozilla Public License Version 2.0.
Your feedback and/or pull requests is very welcome!

## Contributors

Created by [arnaud.cool](https://arnaud.cool). You can also hire me at [arnaud.engineer](https://arnaud.engineer).
