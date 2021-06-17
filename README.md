truesiz.es
==============

# Description

truesiz.es is a web tool to display real size dimensions in your browser.

Its main strengths are :
- **self-calibration utilities** (with device identification, and when impossible at least device type identification)
- **manual calibration** with 2 modes : by screen size entry or by fitting a frame with an usual object, like a credit card (manual calibration is of course automatically saved)
- **multiscreen support** with automatic screen change detection and already calibrated screen detection.
- **mobile compatibility** (installable as a Progressive Web App, with a responsive interface)
- plenty of practical functions : **graduations**, **fullscreen mode**, **light/dark mode**

# About the tool

## Usage

As an user, you can simply go on [truesiz.es](https://truesiz.es). If you want your own instance, you just need to install the web server of your choice and add the sources to your server repository.

## Technical Stack

This PWA mainly uses Vanilla JS, HTML and CSS. It only has 2 JS librairies dependencies, included in the sources :
- device-detection : it allows to detect device/device type and return various datas such as name, screen size, … This library has been especially crafted for [truesiz.es](https://truesiz.es).
- [51 degress’s Renderer](https://github.com/51degrees/renderer) : a really inventive tool that allows to get around Apple GPU obfuscation on iOS.

# Contributing

## It’s a free project

This is a free/libre PWA under Mozilla Public License Version 2.0.
Your feedback and/or pull requests is very welcome!

## Contributors

Created by [arnaud.cool](https://arnaud.cool). You can also hire me at [arnaud.engineer](https://arnaud.engineer).