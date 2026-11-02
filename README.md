# UI Toolkit

![CodeQL](https://img.shields.io/github/actions/workflow/status/device-management-toolkit/ui-toolkit/codeql-analysis.yml?style=for-the-badge&label=CodeQL&logo=github)
![Build](https://img.shields.io/github/actions/workflow/status/device-management-toolkit/ui-toolkit/node.js.yml?style=for-the-badge&logo=github)
![Codecov](https://img.shields.io/codecov/c/github/device-management-toolkit/ui-toolkit?style=for-the-badge&logo=codecov)
[![OSSF-Scorecard Score](https://img.shields.io/ossf-scorecard/github.com/device-management-toolkit/ui-toolkit?style=for-the-badge&label=OSSF%20Score)](https://api.securityscorecards.dev/projects/github.com/device-management-toolkit/ui-toolkit)
[![Discord](https://img.shields.io/discord/1063200098680582154?style=for-the-badge&label=Discord&logo=discord&logoColor=white&labelColor=%235865F2&link=https%3A%2F%2Fdiscord.gg%2FDKHeUNEWVH)](https://discord.gg/DKHeUNEWVH)

> Disclaimer: Production viable releases are tagged and listed under 'Releases'. All other check-ins should be considered 'in-development' and should not be used in production

> IMPORTANT: For now, we are continuing to publish both @device-management-toolkit/ui-toolkit and @open-amt-cloud-toolkit/ui-toolkit npm packages to avoid a breaking change. Please update your package.json at your earliest convenience for when we cease to publish @open-amt-cloud-toolkit/ui-toolkit. This is in effort to support the renaming of the toolkit.

The UI Toolkit is a framework agnostic implementation of remote management features like Keyboard, Video, Mouse (KVM) or Serial-over-LAN (SOL). The provided core components simplify the task of adding these complex manageability controls into a management console UI.

The UI Toolkit can be used with your front-end framework of choice such as ReactJS, Angular, or many others. See the [ui-toolkit-react](https://github.com/device-management-toolkit/ui-toolkit-react) and [ui-toolkit-angular](https://github.com/device-management-toolkit/ui-toolkit-angular) repos for framework-specific, pre-built example UI Toolkit implementations.

## KVM viewer

`KvmViewer` connects to a device through the relay and renders its screen to a canvas:

```ts
import { KvmViewer } from '@device-management-toolkit/ui-toolkit/core'

const viewer = new KvmViewer(canvas)
viewer.onConnectionStateChange = (state) => console.log(state)
const keyboard = viewer.createKeyboardHelper()

viewer.start({ server: 'wss://host/mps/ws/relay', deviceId, authToken, bpp: 1 })
keyboard.GrabKeyInput()
// ...
viewer.stop() // ends the session; the viewer can be started again
viewer.dispose() // releases the canvas listeners and the worker
```

- **Worker rendering.** When `OffscreenCanvas` is supported, the canvas is transferred to a
  dedicated worker that parses the RFB stream, decodes RAW/ZRLE tiles and paints. Decoded pixels
  never return to the main thread. The worker ships inline in the bundle. If a Content Security
  Policy disallows `blob:` workers, pass `createWorker`, or set `useWorker: false` to run
  everything on the main thread.
- **Input first.** The WebSocket stays on the main thread, so keyboard and mouse events are
  written immediately and never wait behind frame decoding. Only pointer moves are throttled
  (`inputThrottleMs`, default 33 ms); the latest position is always sent.
- **Frame requests.** Up to two framebuffer update requests are kept outstanding, and a slot is
  refilled when an update has been fully decoded. While the page is hidden, requests slow to one
  per second so the relay keeps the connection open.
- **Presentation.** Each update is painted as soon as its last rectangle is decoded. Only the
  changed regions are uploaded, and the canvas never shows a partially decoded update.
- **Canvas sizing and mouse.** The viewer sizes the canvas to the remote screen and listens to
  its mouse and wheel events, so the host only lays the canvas out. A fullscreen canvas with
  `object-fit: contain` is mapped correctly.

## Additional Resources

- For detailed documentation and Getting Started, [visit the docs site](https://device-management-toolkit.github.io/docs).

- Looking to contribute? [Find more information here about contribution guidelines and practices](.\CONTRIBUTING.md).

- Find a bug? Or have ideas for new features? [Open a new Issue](https://github.com/device-management-toolkit/ui-toolkit/issues).

- Need additional support or want to get the latest news and events about Open AMT? Connect with the team directly through Discord.

  [![Discord Banner 1](https://discordapp.com/api/guilds/1063200098680582154/widget.png?style=banner2)](https://discord.gg/DKHeUNEWVH)

## License Note

If you are distributing the FortAwesome Icons, please provide attribution to the source per the [CC-by 4.0](https://creativecommons.org/licenses/by/4.0/deed.ast) license obligations.
