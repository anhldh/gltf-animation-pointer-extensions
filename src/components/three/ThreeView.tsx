import { useEffect, useRef } from "react";
import { GltfAnimationPointerViewer } from "./GltfAnimationPointerViewer";

interface ThreeViewProps {
  url: string;
  autoRotate?: boolean;
}

/**
 * Bọc GltfAnimationPointerViewer (three thuần) trong một component React:
 * tạo viewer khi mount, load model, start render loop, dispose khi unmount.
 */
const ThreeView = ({ url, autoRotate = false }: ThreeViewProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<GltfAnimationPointerViewer | null>(null);

  // Khởi tạo / dọn viewer theo vòng đời component.
  useEffect(() => {
    if (!canvasRef.current) return;
    const viewer = new GltfAnimationPointerViewer(canvasRef.current, {
      autoRotate,
    });
    viewerRef.current = viewer;
    viewer.start();
    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
    // Chỉ dựng lại viewer khi canvas đổi; url/autoRotate xử lý ở effect khác.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load model mỗi khi url đổi.
  useEffect(() => {
    viewerRef.current?.load(url).catch((err) => {
      console.error("[three] load model lỗi", err);
    });
  }, [url]);

  // Đồng bộ autoRotate.
  useEffect(() => {
    viewerRef.current?.setAutoRotate(autoRotate);
  }, [autoRotate]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />;
};

export default ThreeView;
