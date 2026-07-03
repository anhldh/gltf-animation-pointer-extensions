import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Center, useAnimations, useGLTF } from "@react-three/drei";
import { Group, Mesh, type Material } from "three";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader.js";
import type {
  GLTFLoader,
  GLTFParser,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFAnimationPointerExtension } from "../../lib";

interface ModelProps {
  /** Object URL (tạo từ file người dùng kéo/chọn) hoặc URL tĩnh. */
  url: string;
  /** Hiển thị dạng khung dây. */
  wireframe?: boolean;
}

/**
 * Load .glb/.gltf bằng useGLTF của drei, đăng ký KTX2 + extension
 * KHR_animation_pointer của dự án. <Center> lo căn giữa; <Bounds> ở ngoài
 * (trong Scene) lo fit camera. Tự phát clip đầu tiên nếu có.
 */
const Model = ({ url, wireframe = false }: ModelProps) => {
  const group = useRef<Group>(null);
  const gl = useThree((s) => s.gl);

  const gltf = useGLTF(
    url,
    true, // Draco
    true, // Meshopt
    (loader) => {
      // drei lấy GLTFLoader từ three-stdlib, còn KTX2Loader + extension của dự
      // án viết theo three/examples. Runtime giống nhau nên cast type an toàn.
      const l = loader as unknown as GLTFLoader;

      const ktx2 = new KTX2Loader();
      ktx2.setTranscoderPath(
        "https://cdn.jsdelivr.net/npm/three@0.185.0/examples/jsm/libs/basis/",
      );
      ktx2.detectSupport(gl);
      l.setKTX2Loader(ktx2);

      // Đăng ký KHR_animation_pointer — chỉ cần import extension rồi register.
      l.register((p: GLTFParser) => new GLTFAnimationPointerExtension(p));
    },
  );

  // Bật/tắt wireframe trên mọi material của model.
  useEffect(() => {
    gltf.scene.traverse((obj) => {
      if (!(obj instanceof Mesh)) return;
      const mats: Material[] = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];
      for (const m of mats) {
        (m as Material & { wireframe?: boolean }).wireframe = wireframe;
      }
    });
  }, [gltf.scene, wireframe]);

  const { actions, names } = useAnimations(gltf.animations, group);

  // Tự phát clip đầu tiên khi model sẵn sàng.
  useEffect(() => {
    const first = names[0];
    const action = first ? actions[first] : undefined;
    action?.reset().fadeIn(0.2).play();
    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names]);

  return (
    <group ref={group}>
      <Center>
        <primitive object={gltf.scene} />
      </Center>
    </group>
  );
};

export default Model;
