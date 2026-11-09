import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Music3DCell } from '../../types';

interface Music3DIsometricCubeProps {
  cells: Music3DCell[];
  selectedCode?: string | null;
  onSelectCell: (code: string) => void;
}

export const Music3DIsometricCube: React.FC<Music3DIsometricCubeProps> = ({
  cells,
  selectedCode,
  onSelectCell,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<Music3DCell | null>(null);
  const [rotationActive, setRotationActive] = useState<boolean>(true);

  // Map codes to cell objects
  const cellMap = useRef<Map<string, Music3DCell>>(new Map());
  useEffect(() => {
    cellMap.current.clear();
    cells.forEach((c) => cellMap.current.set(c.code, c));
  }, [cells]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 480;
    const height = container.clientHeight || 420;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a); // dark slate background

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(7.5, 6.5, 8.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.4);
    dirLight2.position.set(-10, -5, -10);
    scene.add(dirLight2);

    // 3. Coordinate mapping for 3x3x3 grid
    // ABC (X-axis): A = -1, B = 0, C = 1
    // SDE (Y-axis): S = 1, D = 0, E = -1
    // VED (Z-axis): V = 1, E = 0, D = -1
    const abcIndex: Record<string, number> = { A: -1, B: 0, C: 1 };
    const sdeIndex: Record<string, number> = { S: 1, D: 0, E: -1 };
    const vedIndex: Record<string, number> = { V: 1, E: 0, D: -1 };

    const blockSize = 0.85;
    const spacing = 1.05;

    const cubeGroup = new THREE.Group();
    scene.add(cubeGroup);

    const meshMap = new Map<THREE.Mesh, string>();

    // Helper to get color based on service level
    const getColorForServiceLevel = (sl: number, isSelected: boolean) => {
      if (isSelected) return 0xfbbf24; // Amber yellow highlight
      if (sl >= 99) return 0x1d4ed8; // Deep Blue (ASV 99%)
      if (sl >= 95) return 0x2563eb; // Royal Blue (95%)
      if (sl >= 90) return 0x0284c7; // Sky Blue (90%)
      if (sl >= 80) return 0x0d9488; // Teal (80%)
      if (sl >= 75) return 0x16a34a; // Green (75%)
      return 0x64748b; // Slate (60%)
    };

    cells.forEach((cell) => {
      const x = abcIndex[cell.abc] * spacing;
      const y = sdeIndex[cell.sde] * spacing;
      const z = vedIndex[cell.ved] * spacing;

      const isSelected = selectedCode === cell.code;
      const colorHex = getColorForServiceLevel(cell.service_level, isSelected);

      const geometry = new THREE.BoxGeometry(blockSize, blockSize, blockSize);
      const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.35,
        metalness: 0.25,
        transparent: true,
        opacity: cell.part_count > 0 ? 0.95 : 0.45,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);

      // Edges outline
      const edges = new THREE.EdgesGeometry(geometry);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: isSelected ? 0xffffff : 0x334155,
        linewidth: isSelected ? 2 : 1,
      });
      const wireframe = new THREE.LineSegments(edges, lineMaterial);
      mesh.add(wireframe);

      mesh.userData = { code: cell.code };
      cubeGroup.add(mesh);
      meshMap.set(mesh, cell.code);
    });

    // 4. Raycasting for Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cubeGroup.children, true);

      if (intersects.length > 0) {
        let topMesh: THREE.Object3D | null = intersects[0].object;
        while (topMesh && !topMesh.userData?.code && topMesh.parent) {
          topMesh = topMesh.parent;
        }
        if (topMesh?.userData?.code) {
          const code = topMesh.userData.code;
          const found = cellMap.current.get(code);
          if (found) setHoveredCell(found);
          renderer.domElement.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredCell(null);
      renderer.domElement.style.cursor = 'default';
    };

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(cubeGroup.children, true);

      if (intersects.length > 0) {
        let topMesh: THREE.Object3D | null = intersects[0].object;
        while (topMesh && !topMesh.userData?.code && topMesh.parent) {
          topMesh = topMesh.parent;
        }
        if (topMesh?.userData?.code) {
          onSelectCell(topMesh.userData.code);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onClick);

    // 5. Animation Loop
    let animationFrameId: number;
    let isUserDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isUserDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isUserDragging = false;
    };

    const onDragMove = (e: MouseEvent) => {
      if (!isUserDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      cubeGroup.rotation.y += deltaX * 0.008;
      cubeGroup.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onDragMove);

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rotationActive && !isUserDragging) {
        cubeGroup.rotation.y += 0.003;
      }
      renderer.render(scene, camera);
    };
    animate();

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onDragMove);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [cells, selectedCode, rotationActive]);

  return (
    <div className="relative w-full h-[450px] bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-lg flex flex-col">
      {/* 3D Canvas */}
      <div ref={mountRef} className="w-full flex-1 touch-none" />

      {/* Axis Guide & Controls Bar */}
      <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-sm border border-slate-700/60 rounded-lg p-2.5 text-xs text-slate-300 space-y-1 z-10 pointer-events-none">
        <div className="font-semibold text-white flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
          Interactive MUSIC-3D Cube
        </div>
        <div className="text-[10px] space-y-0.5 text-slate-400">
          <div className="flex items-center gap-1">
            <span className="font-bold text-blue-400">X-Axis:</span> ABC (A ← B → C)
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-emerald-400">Y-Axis:</span> SDE (S ↑ D • E ↓)
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-purple-400">Z-Axis:</span> VED (V ↗ E • D ↙)
          </div>
        </div>
      </div>

      {/* Rotation Toggle */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={() => setRotationActive(!rotationActive)}
          className="px-2.5 py-1 text-[11px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 backdrop-blur-sm transition font-medium"
        >
          {rotationActive ? 'Pause Auto-Spin' : 'Resume Spin'}
        </button>
      </div>

      {/* Hovered Cell Info Overlay */}
      {hoveredCell && (
        <div className="absolute bottom-3 left-3 right-3 bg-slate-950/90 backdrop-blur-md border border-slate-700 rounded-lg p-3 text-xs text-white shadow-xl flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold font-mono px-2 py-0.5 rounded bg-blue-600 text-white border border-blue-400">
              {hoveredCell.code}
            </span>
            <div>
              <div className="font-medium text-slate-200">
                {hoveredCell.description}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                <span>Items: <strong className="text-white">{hoveredCell.part_count}</strong></span>
                <span>Annual Spend: <strong className="text-white">INR {hoveredCell.total_spend_inr.toLocaleString()}</strong></span>
                <span>Target SL: <strong className="text-emerald-400">{hoveredCell.service_level}%</strong> (Z={hoveredCell.z_score})</span>
                <span>Target Stockout: <strong className="text-amber-400">{hoveredCell.target_stockout_prob_pct}%</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onSelectCell(hoveredCell.code)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold shadow transition"
          >
            Inspect Parts
          </button>
        </div>
      )}
    </div>
  );
};
