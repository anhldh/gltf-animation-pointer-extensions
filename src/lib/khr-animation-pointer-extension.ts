import {
  Extension,
  ExtensionProperty,
  PropertyType,
  type IProperty,
  type Nullable,
  type Material,
  type Node,
  type ReaderContext,
  type WriterContext,
  type GLTF,
} from "@gltf-transform/core";

/** Tên chính thức của extension. */
export const KHR_ANIMATION_POINTER = "KHR_animation_pointer";

interface IAnimationPointer extends IProperty {
  targetNode: Node;
  targetMaterial: Material;
  suffix: string;
  raw: string | null;
}

export class AnimationPointer extends ExtensionProperty<IAnimationPointer> {
  static override EXTENSION_NAME = KHR_ANIMATION_POINTER;

  declare extensionName: typeof KHR_ANIMATION_POINTER;
  declare propertyType: "AnimationPointer";
  declare parentTypes: [typeof PropertyType.ANIMATION_CHANNEL];

  protected init(): void {
    this.extensionName = KHR_ANIMATION_POINTER;
    this.propertyType = "AnimationPointer";
    this.parentTypes = [PropertyType.ANIMATION_CHANNEL];
  }

  protected override getDefaults(): Nullable<IAnimationPointer> {
    return Object.assign(super.getDefaults() as Nullable<IProperty>, {
      targetNode: null,
      targetMaterial: null,
      suffix: "",
      raw: null,
    });
  }

  // --- node ---
  getTargetNode(): Node | null {
    return this.getRef("targetNode");
  }
  setTargetNode(node: Node | null): this {
    return this.setRef("targetNode", node);
  }

  // --- material ---
  getTargetMaterial(): Material | null {
    return this.getRef("targetMaterial");
  }
  setTargetMaterial(mat: Material | null): this {
    return this.setRef("targetMaterial", mat);
  }

  // --- suffix ---
  getSuffix(): string {
    return this.get("suffix");
  }
  setSuffix(s: string): this {
    return this.set("suffix", s);
  }

  // --- raw fallback ---
  getRaw(): string | null {
    return this.get("raw");
  }
  setRaw(s: string | null): this {
    return this.set("raw", s);
  }
}

export class KHRAnimationPointer extends Extension {
  static override EXTENSION_NAME = KHR_ANIMATION_POINTER;
  override extensionName = KHR_ANIMATION_POINTER;

  override prereadTypes: PropertyType[] = [PropertyType.SCENE];

  createAnimationPointer(): AnimationPointer {
    return new AnimationPointer(this.document.getGraph());
  }

  read(): this {
    return this;
  }

  override preread(context: ReaderContext, propertyType: PropertyType): this {
    if (propertyType !== PropertyType.SCENE) return this;

    const json = context.jsonDoc.json;
    const animDefs = json.animations || [];

    animDefs.forEach((animDef: GLTF.IAnimation, animIndex: number) => {
      const animation = context.animations[animIndex];
      if (!animation) return;
      const channels = animation.listChannels();

      (animDef.channels || []).forEach(
        (channelDef: GLTF.IAnimationChannel, channelIndex: number) => {
          const target = channelDef.target as GLTF.IAnimationChannelTarget & {
            extensions?: { [k: string]: { pointer?: string } };
          };
          const ptr = target?.extensions?.[KHR_ANIMATION_POINTER]?.pointer;
          if (!ptr) return;

          const channel = channels[channelIndex];
          if (!channel) return;

          const ap = this.createAnimationPointer();

          const segs = ptr.replace(/^\//, "").split("/");
          const kind = segs[0];
          const index = Number(segs[1]);
          const suffix = segs.slice(2).join("/");

          if (
            kind === "nodes" &&
            Number.isInteger(index) &&
            context.nodes[index]
          ) {
            ap.setTargetNode(context.nodes[index]).setSuffix(suffix);
          } else if (
            kind === "materials" &&
            Number.isInteger(index) &&
            context.materials[index]
          ) {
            ap.setTargetMaterial(context.materials[index]).setSuffix(suffix);
          } else {
            ap.setRaw(ptr);
            this.document
              .getLogger()
              .warn(
                `[${KHR_ANIMATION_POINTER}] pointer không resolve được (giữ nguyên): ${ptr}`,
              );
          }

          channel.setExtension(KHR_ANIMATION_POINTER, ap);
        },
      );
    });

    return this;
  }

  write(context: WriterContext): this {
    const json = context.jsonDoc.json;

    for (const animation of this.document.getRoot().listAnimations()) {
      const animIndex = context.animationIndexMap.get(animation);
      if (animIndex === undefined) continue;
      const animDef = json.animations?.[animIndex];
      if (!animDef) continue;

      const channels = animation.listChannels();
      channels.forEach((channel, channelIndex) => {
        const ap = channel.getExtension<AnimationPointer>(
          KHR_ANIMATION_POINTER,
        );
        if (!ap) return;

        const channelDef = animDef.channels?.[channelIndex];
        if (!channelDef) return;

        let pointer: string | null = ap.getRaw();

        const node = ap.getTargetNode();
        const material = ap.getTargetMaterial();
        const suffix = ap.getSuffix();

        if (node) {
          const newIndex = context.nodeIndexMap.get(node);
          if (newIndex !== undefined) {
            pointer = `/nodes/${newIndex}${suffix ? "/" + suffix : ""}`;
          }
        } else if (material) {
          const newIndex = context.materialIndexMap.get(material);
          if (newIndex !== undefined) {
            pointer = `/materials/${newIndex}${suffix ? "/" + suffix : ""}`;
          }
        }

        if (!pointer) return;

        const target = (channelDef.target ||
          {}) as GLTF.IAnimationChannelTarget & {
          extensions?: { [k: string]: { pointer: string } };
        };
        target.path = "pointer" as GLTF.AnimationChannelTargetPath;
        target.extensions = target.extensions || {};
        target.extensions[KHR_ANIMATION_POINTER] = { pointer };
        channelDef.target = target;
      });
    }

    return this;
  }
}
