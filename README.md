# Dial-Operated Design Prototypes

This repository collects a series of interaction prototypes that explore a shared "dial-first" input model. Each prototype maps a physical jog dial and companion button onto interface behaviors that could be combined to create complex appliance flows.

## Interaction model
- `o` rotates the dial to the left (counter-clockwise)
- `p` rotates the dial to the right (clockwise)
- `q` presses the dial inward to trigger primary actions or confirm selections
- `1` activates an auxiliary button when a secondary input is required

Use these keys while any prototype window has focus. Most prototypes provide visual feedback so it is clear which control path you are exercising.

## Prototype catalog
The `prototypes/` directory holds focused explorations:
- `circular-time-dial/` and `custom-cook/` investigate circular time and temperature selection mechanics
- `guage-coffee/` visualizes brewing pressure states on a gauge-style dial
- `heat-slider/` explores heat distribution balancing with dial-driven scrubbing
- `list-item/` supplies list manipulation patterns that can slot into larger configuration flows
- `segmented-range/` experiments with segmented, dial-controlled ranges

Some folders are full-screen experiences, while others are smaller components intended to be embedded inside broader cooking flows or system screens.

You can browse the full set via [`index.html`](./index.html), which lists and links to each prototype.
re-run `node scripts/generatePrototypeIndex.mjs` any time a prototype is added or its description changes to keep the homepage feed in sync.

## Shared design system
A lightweight design system keeps the explorations consistent:
- Colors, typography, radii, and motion timings are defined in `shared/tokens.css`
- Reusable layout primitives and behaviors live under `shared/components/`
- `shared/prototype-shell.css` provides the common frame that mimics the target device shell

These tokens allow individual prototypes to stay visually aligned while experimenting with interaction patterns.

## Getting started
Open `index.html` in your browser to launch the prototype gallery, or load an individual prototype HTML file directly. No build step is required; everything runs as static assets.

When extending the system, reuse the shared tokens and dial input conventions so new components continue to compose into coherent flows.

## How the repo is wired
- The reusable pieces live in `shared/components/`. They export plain JavaScript modules such as `HeatSlider`, `CircularTimeDial`, `BASE_GRAY`, and helpers like `createCircularTimeDialDebugSettings`.
- Scenario-specific behaviour is layered in the `prototypes/` folders. Each prototype grabs the shared modules and adds its own markup, state, and debugging UI (for example, `prototypes/custom-cook/` plugs the dial into a mode sequencer and wires up a heat-distribution slider).
- Shared debug controls are wired through the dial’s `bindDebugControl` utility; pass `debugRoot` and `idPrefix` options when you need to reuse your own markup instead of the component’s default template.
- If you opt out of the dial’s built-in key bindings (set `autoBindKeys: false`), call `handleKeydown(event)` yourself so the core behaviours remain consistent across prototypes.

### Minimal dial bootstrap example
```html
<div class="my-dial"></div>
<script type="module">
  import CircularTimeDial from './shared/components/circular-time-dial.js';

  new CircularTimeDial('.my-dial', {
    idPrefix: 'kitchen-demo',
    debugRoot: document.getElementById('debugPanel'),
    autoBindKeys: true
  });
```

Keep this layering contract in mind when you touch the shared modules: a change to the public API usually needs a matching tweak in each prototype that consumes it.
