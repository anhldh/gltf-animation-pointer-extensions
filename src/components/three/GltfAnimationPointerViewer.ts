import {
  AmbientLight,
  AnimationMixer,
  Box3,
  Clock,
  DirectionalLight,
  HemisphereLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
  type AnimationClip,
  type Object3D,
} from "three";
import {
  GLTFLoader,
  type GLTFParser,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  GLTFAnimationPointerExtension,
  type AnimationPointerResolver,
} from "../../lib";

export interface ViewerOptions {
  /** Tự động phát clip đầu tiên sau khi load. Mặc định true. */
  autoplay?: boolean;
  /** Tự xoay camera quanh model. Mặc định false. */
  autoRotate?: boolean;
  /** Tùy chọn: resolver remap pointer path -> property three.js. */
  resolver?: AnimationPointerResolver | null;
}

/**
 * Viewer three.js tối giản dùng làm ví dụ tham chiếu: dựng renderer / scene /
 * camera / đèn / OrbitControls, load model qua loader đã gắn extension, rồi
 * chạy AnimationMixer trong render loop.
 *
 * ```ts
 * const viewer = new GltfAnimationPointerViewer(canvas);
 * await viewer.load("/model.glb");
 * viewer.start();
 * // ...
 * viewer.dispose();
 * ```
 */
export class GltfAnimationPointerViewer {
  readonly renderer: WebGLRenderer;
  readonly scene: Scene;
  readonly camera: PerspectiveCamera;
  readonly controls: OrbitControls;

  private readonly canvas: HTMLCanvasElement;
  private readonly clock = new Clock();
  private readonly loader: GLTFLoader;
  private readonly options: ViewerOptions;

  private mixer: AnimationMixer | null = null;
  private model: Object3D | null = null;
  private clips: AnimationClip[] = [];
  private rafId = 0;

  constructor(canvas: HTMLCanvasElement, options: ViewerOptions = {}) {
    this.canvas = canvas;
    this.options = { autoplay: true, autoRotate: false, ...options };

    // Tích hợp: chỉ cần import extension rồi register vào GLTFLoader.
    this.loader = new GLTFLoader();
    this.loader.register((parser: GLTFParser) => {
      const ext = new GLTFAnimationPointerExtension(parser);
      if (options.resolver) ext.setAnimationPointerResolver(options.resolver);
      return ext;
    });

    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new Scene();
    this.camera = new PerspectiveCamera(50, 1, 0.1, 1000);
    this.camera.position.set(3, 2, 4);

    // Đèn cơ bản để MeshStandardMaterial không bị đen.
    this.scene.add(new AmbientLight(0xffffff, 0.6));
    this.scene.add(new HemisphereLight(0xffffff, 0x444444, 0.8));
    const dir = new DirectionalLight(0xffffff, 1.5);
    dir.position.set(5, 10, 7);
    this.scene.add(dir);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.autoRotate = this.options.autoRotate ?? false;

    this.resize();
    window.addEventListener("resize", this.resize);
  }

  /** Load model, tạo mixer từ animations, căn camera vừa khít. */
  async load(url: string): Promise<void> {
    const gltf = await this.loader.loadAsync(url);

    if (this.model) this.scene.remove(this.model);

    this.model = gltf.scene;
    this.clips = gltf.animations;
    this.scene.add(this.model);
    this.frameModel(this.model);

    this.mixer = new AnimationMixer(this.model);
    if (this.options.autoplay && this.clips.length > 0) {
      this.play(this.clips[0].name);
    }
  }

  /** Phát một clip theo tên (nếu tồn tại). */
  play(name: string): void {
    if (!this.mixer) return;
    const clip = this.clips.find((c) => c.name === name);
    if (!clip) return;
    this.mixer.clipAction(clip).reset().play();
  }

  /** Bật/tắt tự xoay. */
  setAutoRotate(value: boolean): void {
    this.controls.autoRotate = value;
  }

  /** Bắt đầu render loop. */
  start(): void {
    if (this.rafId) return;
    this.clock.start();
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      const delta = this.clock.getDelta();
      this.mixer?.update(delta);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  /** Dừng render loop. */
  stop(): void {
    if (!this.rafId) return;
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /** Căn camera + target để model nằm gọn trong khung nhìn. */
  private frameModel(object: Object3D): void {
    const box = new Box3().setFromObject(object);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const fov = (this.camera.fov * Math.PI) / 180;
    const dist = (maxDim / 2 / Math.tan(fov / 2)) * 1.6;

    this.camera.position.copy(center).add(new Vector3(dist, dist * 0.6, dist));
    this.camera.near = dist / 100;
    this.camera.far = dist * 100;
    this.camera.updateProjectionMatrix();

    this.controls.target.copy(center);
    this.controls.update();
  }

  private resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Giải phóng tài nguyên. */
  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.resize);
    this.controls.dispose();
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.renderer.dispose();
  }
}
