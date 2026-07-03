import { useEffect, useRef, useState } from "react";
import Scene from "./components/r3f/Scene";
import ThreeView from "./components/three/ThreeView";

type Mode = "r3f" | "three";

// Model animated mặc định (three.js examples). Người dùng có thể chọn file khác.
const DEFAULT_URL = "https://threejs.org/examples/models/gltf/Soldier.glb";

const R3F_SNIPPET = `import { useGLTF } from "@react-three/drei";
import type { GLTFLoader, GLTFParser } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFAnimationPointerExtension } from "anhldh-gltf-animation-pointer";

const gltf = useGLTF(url, true, true, (loader) => {
  // drei dùng GLTFLoader của three-stdlib -> cast sang three/examples.
  const l = loader as unknown as GLTFLoader;

  // chỉ cần import extension rồi register là xong:
  l.register((p: GLTFParser) => new GLTFAnimationPointerExtension(p));
});`;

const THREE_SNIPPET = `import { AnimationMixer } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFAnimationPointerExtension } from "anhldh-gltf-animation-pointer";

const loader = new GLTFLoader();
loader.register((p) => new GLTFAnimationPointerExtension(p));

const gltf = await loader.loadAsync(url);
const mixer = new AnimationMixer(gltf.scene);
mixer.clipAction(gltf.animations[0]).play();`;

const MONO =
  'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const btn = (active: boolean): React.CSSProperties => ({
  padding: "8px 14px",
  borderRadius: 8,
  border: `1px solid ${active ? "#333" : "#ccc"}`,
  background: active ? "#f0f0f0" : "transparent",
  color: active ? "#000" : "#444",
  font: "inherit",
  fontSize: 15,
  cursor: "pointer",
});

const App = () => {
  const [mode, setMode] = useState<Mode>("r3f");
  const [showCode, setShowCode] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [url, setUrl] = useState(DEFAULT_URL);
  const objectUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Thu hồi object URL cũ khi đổi file / unmount để tránh rò bộ nhớ.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const next = URL.createObjectURL(file);
    objectUrlRef.current = next;
    setUrl(next);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        textAlign: "left",
        minHeight: 0,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          padding: "12px 16px",
          borderBottom: "1px solid #ddd",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btn(mode === "r3f")} onClick={() => setMode("r3f")}>
            React Three Fiber
          </button>
          <button
            style={btn(mode === "three")}
            onClick={() => setMode("three")}
          >
            Three.js thuần
          </button>
        </div>

        <div style={{ flex: 1 }} />

        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={autoRotate}
            onChange={(e) => setAutoRotate(e.target.checked)}
          />
          Auto-rotate
        </label>

        {mode === "r3f" && (
          <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={wireframe}
              onChange={(e) => setWireframe(e.target.checked)}
            />
            Wireframe
          </label>
        )}

        <button style={btn(false)} onClick={() => fileInputRef.current?.click()}>
          Chọn model…
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf"
          hidden
          onChange={onPickFile}
        />

        <button
          style={btn(showCode)}
          onClick={() => setShowCode((v) => !v)}
          title="Xem code tích hợp"
        >
          {"</>"}
        </button>
      </header>

      <main style={{ position: "relative", flex: 1, minHeight: "70vh" }}>
        {mode === "r3f" ? (
          <Scene url={url} autoRotate={autoRotate} wireframe={wireframe} />
        ) : (
          <ThreeView url={url} autoRotate={autoRotate} />
        )}

        {showCode && (
          <pre
            style={{
              position: "absolute",
              inset: 0,
              margin: 0,
              overflow: "auto",
              padding: 20,
              background: "#f5f5f5",
              color: "#111",
              font: `14px/1.5 ${MONO}`,
              whiteSpace: "pre",
            }}
          >
            <code style={{ display: "block", background: "none", padding: 0 }}>
              {mode === "r3f" ? R3F_SNIPPET : THREE_SNIPPET}
            </code>
          </pre>
        )}
      </main>
    </div>
  );
};

export default App;
