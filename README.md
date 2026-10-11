# @anhldh/gltf-animation-pointer-extensions

[![npm version](https://img.shields.io/npm/v/@anhldh/gltf-animation-pointer-extensions.svg)](https://www.npmjs.com/package/@anhldh/gltf-animation-pointer-extensions)
[![npm downloads](https://img.shields.io/npm/dm/@anhldh/gltf-animation-pointer-extensions.svg)](https://www.npmjs.com/package/@anhldh/gltf-animation-pointer-extensions)
[![license](https://img.shields.io/npm/l/@anhldh/gltf-animation-pointer-extensions.svg)](https://github.com/anhldh/gltf-animation-pointer-extensions/blob/main/LICENSE)

Support for the glTF [`KHR_animation_pointer`](https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_animation_pointer/README.md) extension on **both sides** of the pipeline:

- **Runtime (three.js)**: load models that use `KHR_animation_pointer` with `GLTFLoader` (and drei's `useGLTF`). three.js does **not** support it by default, so those animations simply don't play.
- **Build-time (gltf-transform)**: **preserve** `KHR_animation_pointer` channels while processing/optimizing a model. gltf-transform **drops** them by default.

## 🔎 Try it online — [gltf.info](https://gltf.info)

Want to check a model before writing any code? Open **[gltf.info](https://gltf.info)** and drop in your `.glb` / `.gltf` file to preview it in the browser, including animations that use `KHR_animation_pointer`.

## What is `KHR_animation_pointer`?

The extension lets an animation target almost any property of a model via a JSON pointer. Beyond node transforms, it can animate material factors and texture transforms, light parameters (`KHR_lights_punctual`), cameras, morph weights, visibility, and more. Because it lives outside "classic" animation, both three.js and gltf-transform ignore it unless a dedicated extension handles it.

## Installation

```bash
pnpm add @anhldh/gltf-animation-pointer-extensions
```

Peer dependencies are **optional**. Install only the side you use:

```bash
# runtime (three.js)
pnpm add three

# build-time (gltf-transform)
pnpm add @gltf-transform/core @gltf-transform/extensions
```

## Usage: three.js

### Plain GLTFLoader

```ts
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFAnimationPointerExtension } from "@anhldh/gltf-animation-pointer-extensions";

const loader = new GLTFLoader();
loader.register((p) => new GLTFAnimationPointerExtension(p));

const gltf = await loader.loadAsync("model.glb");
// gltf.animations now contains tracks generated from KHR_animation_pointer
```

### React Three Fiber (drei `useGLTF`)

The 4th argument of `useGLTF` is `extendLoader`, which is where you register the extension:

```tsx
import { useGLTF } from "@react-three/drei";
import type {
  GLTFLoader,
  GLTFParser,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFAnimationPointerExtension } from "@anhldh/gltf-animation-pointer-extensions";

const gltf = useGLTF(url, true, true, (loader) => {
  // drei uses the three-stdlib GLTFLoader -> cast to three/examples.
  const l = loader as unknown as GLTFLoader;
  l.register((p: GLTFParser) => new GLTFAnimationPointerExtension(p));
});
```

> `useGLTF` caches by URL, so `extendLoader` only runs on the first load of each URL.

## Usage: gltf-transform

When you run a gltf-transform pipeline (`weld`, `dedup`, `draco`, `resample`, `prune`, ...), `KHR_animation_pointer` channels are dropped by default. Register `KHRAnimationPointer` to read and write them back correctly. It automatically **remaps pointers to the new node/material indices** after transforms.

```ts
import { WebIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { KHRAnimationPointer } from "@anhldh/gltf-animation-pointer-extensions/transform";

const io = new WebIO().registerExtensions([
  ...ALL_EXTENSIONS,
  KHRAnimationPointer,
]);

const doc = await io.read(url); // preread: maps pointer -> Node/Material
// ...doc.transform(...)...        // pointers follow Node/Material, stay correct
const glb = await io.writeBinary(doc); // write: emits pointer with new indices
```

On Node, use `NodeIO` instead of `WebIO`:

```ts
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { KHRAnimationPointer } from "@anhldh/gltf-animation-pointer-extensions/transform";

const io = new NodeIO().registerExtensions([
  ...ALL_EXTENSIONS,
  KHRAnimationPointer,
]);

const doc = await io.read("in.glb");
await io.write("out.glb", doc);
```

## API

**three.js side**, from `@anhldh/gltf-animation-pointer-extensions`:

- `GLTFAnimationPointerExtension`: plugin registered via `GLTFLoader.register(...)`.
- `.setAnimationPointerResolver(resolver)`: customize how a pointer path maps to a three.js property.
- `invalidateMaterialCache(root)`: clear the material cache when materials are swapped/cloned at runtime.
- type `AnimationPointerResolver`.

**gltf-transform side**, from `@anhldh/gltf-animation-pointer-extensions/transform`:

- `KHRAnimationPointer`: `Extension` registered on the IO (`WebIO` / `NodeIO`).
- `AnimationPointer`: `ExtensionProperty` attached to an `AnimationChannel`.
- `KHR_ANIMATION_POINTER`: the extension-name constant (`"KHR_animation_pointer"`).

## Notes

- The three.js side patches `PropertyBinding.findNode` (global, once, guarded) so pointers can bind to material / texture / light / camera. Textures shared across materials are cloned before binding to avoid animating the wrong one.
- If an animation fails, the extension returns an empty clip instead of breaking the whole model. The model still loads; only that animation is lost.
- Published builds are **minified**. Read the source on [GitHub](https://github.com/anhldh/gltf-animation-pointer-extensions).
- The two sides are separate entry points: `.` (three.js) and `/transform` (gltf-transform). Importing one never loads the other's peer dependency, so you only need the peer dep of the side you actually import.

## Related packages

- [`@anhldh/gltf-lod-loader`](https://www.npmjs.com/package/@anhldh/gltf-lod-loader): LOD loading for glTF models in three.js.
- [`r3f-monitor`](https://www.npmjs.com/package/r3f-monitor): performance monitor for React Three Fiber.

## Author

Made by **Hoàng Anh** ([@anhldh](https://github.com/anhldh))

- Website: [anhldh.com](https://anhldh.com)
- Online glTF viewer: [gltf.info](https://gltf.info)
- GitHub: [github.com/anhldh](https://github.com/anhldh)
- npm: [npmjs.com/~anhldh](https://www.npmjs.com/~anhldh)

Issues and pull requests are welcome on [GitHub](https://github.com/anhldh/gltf-animation-pointer-extensions/issues).

## License

[MIT](https://github.com/anhldh/gltf-animation-pointer-extensions/blob/main/LICENSE) © [Hoàng Anh](https://anhldh.com)
