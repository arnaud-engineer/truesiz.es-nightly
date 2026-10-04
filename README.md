# True Sizes Nightly / GPT

The root [Nightly application](https://dev.truesiz.es/) now consumes GPT Device
Data Detector 0.2.0-experimental. It renders an ideal rectangle from two current,
independent CSS/cm references, never from a guessed diagonal or nominal PPI.
Recognition is indicative and physical accuracy is not validated.

## Maintained Sources

`index.html`, `app.css`, `app.mjs` are the Nightly app. `gpt-engine/` is the
manifest-owned SDK distribution from the canonical GPT-device-data-detector
repository, not a second source tree. Its [guide](gpt-engine/GUIDE.txt),
[source notice](gpt-engine/SOURCES.txt), MPL license and Lucide notices are included.
Do not hand-edit copied SDK files. The older `gpt/` lab is independently versioned
and unchanged. The old `script.js`, styles, bundles and PWA files remain historical
references but are no longer loaded by the root app. Existing Pages main `/`,
CNAME and deployment configuration are unchanged. Stable True Sizes is untouched.

## Preview And Verification

Use Node 22+ with `node preview.mjs 8788`; open http://127.0.0.1:8788/.
This preview allowlists tracked assets and SDK manifest entries, excluding private
AGENTS and Git metadata. The canonical GPT checkout owns `npm test`,
`npm run test:types`, `npm run build:sdk`, `npm run copy:nightly`,
`npm run test:nightly` and `npm run test:nightly:adversarial`.
Fixtures exercise software failure paths, not real multi-screen/physical length.
Review fresh Git refs and protected copy ownership before every release.

## Privacy And Limits

No analytics, third-party runtime requests, GPU/battery benchmark or label/serial
collection. Optional model and screen acquisition only run after commands.
`gpt-ddd:profile:v1` stores draft references on explicit save; restoring requires
reconfirmation. `gpt-truesizes:preferences:v1` stores only unit/theme/graduations.
Profile reset touches neither preferences nor any legacy key. Same-origin storage
prefixes are not security isolation. Known segment-spanning or transformed zones
are refused; invisible identical-context panel swaps remain undetectable.

## Historical Documentation

The text below describes the previous app. Its automatic calibration, multi-screen
recognition and PWA claims do not describe or validate this experimental engine.

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
