import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Bounds,
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import Model from "./Model";

interface SceneProps {
  url: string;
  autoRotate?: boolean;
  wireframe?: boolean;
}

/** Đèn cơ bản (thay cho component Environment của dự án gốc). */
const Lights = () => (
  <>
    <ambientLight intensity={0.6} />
    <hemisphereLight args={[0xffffff, 0x444444, 0.8]} />
    <directionalLight position={[5, 10, 7]} intensity={1.5} />
  </>
);

/**
 * <Canvas> R3F: camera + OrbitControls + đèn, bọc Model trong <Suspense> và
 * <Bounds> để tự fit khung nhìn theo model.
 */
const Scene = ({ url, autoRotate = false, wireframe = false }: SceneProps) => {
  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[3, 2, 4]} fov={50} />
      <OrbitControls makeDefault enableDamping autoRotate={autoRotate} />

      <Lights />

      <Suspense fallback={null}>
        <Bounds key={url} fit clip observe margin={1.2}>
          <Model url={url} wireframe={wireframe} />
        </Bounds>
      </Suspense>
    </Canvas>
  );
};

export default Scene;
