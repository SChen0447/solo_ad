import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { BouquetFlower } from '../../types';
import { useStore } from '../store/Store';

interface BouquetPreviewProps {
  flowers: BouquetFlower[];
}

const BouquetPreview: React.FC<BouquetPreviewProps> = ({ flowers }) => {
  const { state } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const bouquetGroupRef = useRef<THREE.Group | null>(null);
  const isDraggingRef = useRef(false);
  const previousMouseRef = useRef({ x: 0, y: 0 });
  const rotationYRef = useRef(0);
  const elevationRef = useRef(Math.PI / 4);
  const autoRotateRef = useRef(true);
  const animationIdRef = useRef<number>(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const createFlowerMesh = (flower: BouquetFlower, index: number, total: number): THREE.Group => {
    const group = new THREE.Group();

    const angle = (index / total) * Math.PI * 2 + Math.random() * 0.3;
    const radius = 0.3 + Math.random() * 0.2;
    const heightOffset = 0.1 + Math.random() * 0.4;

    const randomOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.15,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.15
    );

    const position = new THREE.Vector3(
      Math.cos(angle) * radius + randomOffset.x,
      heightOffset + randomOffset.y,
      Math.sin(angle) * radius + randomOffset.z
    );

    const scale = 0.6 + flower.scale * 0.4;
    const rotation = (flower.rotation * Math.PI) / 180;

    if (flower.category === '玫瑰') {
      const petalGeometry = new THREE.SphereGeometry(0.08, 16, 16);
      const petalMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(flower.color),
        transparent: true,
        opacity: 0.9,
      });
      const petalCount = 5;
      for (let i = 0; i < petalCount; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        const petalAngle = (i / petalCount) * Math.PI * 2;
        petal.position.set(
          Math.cos(petalAngle) * 0.05,
          0.02 + Math.sin(i * 0.5) * 0.03,
          Math.sin(petalAngle) * 0.05
        );
        petal.scale.set(1, 0.6, 0.8);
        group.add(petal);
      }
      const centerGeometry = new THREE.SphereGeometry(0.05, 12, 12);
      const centerMaterial = new THREE.MeshLambertMaterial({ color: 0xffff00 });
      const center = new THREE.Mesh(centerGeometry, centerMaterial);
      group.add(center);
    } else if (flower.category === '百合') {
      const petalGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const petalMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(flower.color),
        transparent: true,
        opacity: 0.85,
      });
      for (let i = 0; i < 6; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        const petalAngle = (i / 6) * Math.PI * 2;
        petal.position.set(
          Math.cos(petalAngle) * 0.08,
          0.05 + Math.sin(petalAngle) * 0.02,
          Math.sin(petalAngle) * 0.08
        );
        petal.scale.set(0.8, 0.5, 1.2);
        group.add(petal);
      }
      const pistilGeometry = new THREE.CylinderGeometry(0.01, 0.015, 0.08, 8);
      const pistilMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
      const pistil = new THREE.Mesh(pistilGeometry, pistilMaterial);
      pistil.position.y = 0.08;
      group.add(pistil);
    } else if (flower.category === '满天星') {
      const dotGeometry = new THREE.SphereGeometry(0.02, 6, 6);
      const dotMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(flower.color),
        transparent: true,
        opacity: 0.9,
      });
      for (let i = 0; i < 15; i++) {
        const dot = new THREE.Mesh(dotGeometry, dotMaterial);
        dot.position.set(
          (Math.random() - 0.5) * 0.2,
          Math.random() * 0.2,
          (Math.random() - 0.5) * 0.2
        );
        dot.scale.setScalar(0.5 + Math.random() * 0.8);
        group.add(dot);
      }
    } else if (flower.category === '尤加利叶') {
      const leafGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const leafMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(flower.color),
        transparent: true,
        opacity: 0.8,
      });
      for (let i = 0; i < 4; i++) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.set(
          (Math.random() - 0.5) * 0.15,
          Math.random() * 0.15,
          (Math.random() - 0.5) * 0.15
        );
        leaf.scale.set(1.2, 0.3, 0.8);
        leaf.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        group.add(leaf);
      }
    } else if (flower.category === '康乃馨') {
      const petalGeometry = new THREE.SphereGeometry(0.06, 8, 8);
      const petalMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(flower.color),
        transparent: true,
        opacity: 0.9,
      });
      for (let i = 0; i < 8; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        const layer = i < 4 ? 0 : 1;
        const angle = ((i % 4) / 4) * Math.PI * 2 + layer * 0.4;
        petal.position.set(
          Math.cos(angle) * (0.04 + layer * 0.02),
          0.02 + layer * 0.03,
          Math.sin(angle) * (0.04 + layer * 0.02)
        );
        petal.scale.set(1, 0.5, 0.8);
        group.add(petal);
      }
    } else if (flower.category === '向日葵') {
      const centerGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16);
      const centerMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
      const center = new THREE.Mesh(centerGeometry, centerMaterial);
      center.rotation.x = Math.PI / 2;
      group.add(center);

      const petalGeometry = new THREE.SphereGeometry(0.08, 8, 8);
      const petalMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(flower.color),
        transparent: true,
        opacity: 0.9,
      });
      for (let i = 0; i < 14; i++) {
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        const petalAngle = (i / 14) * Math.PI * 2;
        petal.position.set(
          Math.cos(petalAngle) * 0.09,
          0,
          Math.sin(petalAngle) * 0.09
        );
        petal.scale.set(0.6, 0.3, 1.2);
        petal.rotation.y = petalAngle;
        group.add(petal);
      }
    } else {
      const defaultGeometry = new THREE.SphereGeometry(0.08, 12, 12);
      const defaultMaterial = new THREE.MeshLambertMaterial({
        color: new THREE.Color(flower.color),
      });
      const defaultMesh = new THREE.Mesh(defaultGeometry, defaultMaterial);
      group.add(defaultMesh);
    }

    const stemGeometry = new THREE.CylinderGeometry(0.01, 0.015, 0.4, 8);
    const stemMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = -0.25;
    group.add(stem);

    group.position.copy(position);
    group.scale.setScalar(scale);
    group.rotation.y = rotation;

    return group;
  };

  const createWrapping = (): THREE.Mesh => {
    const wrappingGeometry = new THREE.SphereGeometry(0.7, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
    const wrappingMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      shininess: 100,
    });
    const wrapping = new THREE.Mesh(wrappingGeometry, wrappingMaterial);
    wrapping.position.y = -0.1;
    return wrapping;
  };

  const createRibbon = (): THREE.Group => {
    const ribbonGroup = new THREE.Group();
    const ribbonMaterial = new THREE.MeshPhongMaterial({
      color: 0xFFB6C1,
      shininess: 50,
      side: THREE.DoubleSide,
    });

    for (let i = 0; i < 2; i++) {
      const loopGeometry = new THREE.TorusGeometry(0.08, 0.015, 8, 16);
      const loop = new THREE.Mesh(loopGeometry, ribbonMaterial);
      loop.rotation.x = Math.PI / 2;
      loop.position.set(i === 0 ? -0.05 : 0.05, -0.05, 0.65);
      ribbonGroup.add(loop);
    }

    const tailGeometry = new THREE.PlaneGeometry(0.03, 0.15);
    for (let i = 0; i < 2; i++) {
      const tail = new THREE.Mesh(tailGeometry, ribbonMaterial);
      tail.position.set(i === 0 ? -0.04 : 0.04, -0.12, 0.65);
      tail.rotation.z = i === 0 ? -0.3 : 0.3;
      ribbonGroup.add(tail);
    }

    return ribbonGroup;
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xFAF8F5);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(2, 1.5, 2);
    camera.lookAt(0, 0.2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0xffeedd, 0.5);
    pointLight.position.set(-3, 5, 3);
    scene.add(pointLight);

    const bouquetGroup = new THREE.Group();
    bouquetGroup.add(createWrapping());
    bouquetGroup.add(createRibbon());
    scene.add(bouquetGroup);
    bouquetGroupRef.current = bouquetGroup;

    const groundGeometry = new THREE.CircleGeometry(1, 32);
    const groundMaterial = new THREE.MeshPhongMaterial({
      color: 0xf5f5f5,
      shininess: 30,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    ground.receiveShadow = true;
    scene.add(ground);

    const updateCameraPosition = () => {
      const distance = 2.5;
      const x = Math.sin(rotationYRef.current) * Math.cos(elevationRef.current) * distance;
      const y = Math.sin(elevationRef.current) * distance;
      const z = Math.cos(rotationYRef.current) * Math.cos(elevationRef.current) * distance;
      if (cameraRef.current) {
        cameraRef.current.position.set(x, y, z);
        cameraRef.current.lookAt(0, 0.2, 0);
      }
    };

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);

      if (autoRotateRef.current && bouquetGroupRef.current) {
        bouquetGroupRef.current.rotation.y += 0.005;
      }

      updateCameraPosition();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      if (cameraRef.current) {
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
      }
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (!bouquetGroupRef.current || !sceneRef.current) return;

    const bouquetGroup = bouquetGroupRef.current;
    const toRemove: THREE.Object3D[] = [];
    bouquetGroup.traverse((child) => {
      if (child.userData.isFlower) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(child => bouquetGroup.remove(child));

    flowers.forEach((flower, index) => {
      const flowerMesh = createFlowerMesh(flower, index, flowers.length);
      flowerMesh.userData.isFlower = true;
      bouquetGroup.add(flowerMesh);
    });
  }, [flowers]);

  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    autoRotateRef.current = false;
    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;

    const deltaX = e.clientX - previousMouseRef.current.x;
    const deltaY = e.clientY - previousMouseRef.current.y;

    rotationYRef.current += deltaX * 0.01;
    elevationRef.current = Math.max(
      Math.PI / 6,
      Math.min(Math.PI / 3, elevationRef.current + deltaY * 0.01)
    );

    previousMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    setTimeout(() => {
      autoRotateRef.current = true;
    }, 3000);
  };

  const totalPrice = flowers.reduce((sum, f) => sum + f.price, 0);

  const flowerCounts = flowers.reduce((acc, f) => {
    acc[f.name] = (acc[f.name] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className={`preview-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="preview-header">
        <h2>3D 预览</h2>
        <button className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? '◀' : '▶'}
        </button>
      </div>

      {!isCollapsed && (
        <>
          <div
            ref={containerRef}
            className="preview-viewport"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {flowers.length === 0 && (
              <div className="preview-empty">
                <div className="empty-icon">🌸</div>
                <div className="empty-text">添加花材后预览3D效果</div>
              </div>
            )}
          </div>

          <div className="preview-summary">
            <div className="summary-title">当前搭配</div>
            <div className="flower-list">
              {Object.entries(flowerCounts).length === 0 ? (
                <div className="no-flowers">暂无花材</div>
              ) : (
                Object.entries(flowerCounts).map(([name, count]) => (
                  <div key={name} className="flower-item">
                    <span className="flower-name">{name}</span>
                    <span className="flower-count">×{count}</span>
                  </div>
                ))
              )}
            </div>
            <div className="summary-total">
              <span>花材总计</span>
              <span className="total-amount">¥{totalPrice}</span>
            </div>
          </div>

          <div className="preview-hint">
            💡 拖拽鼠标旋转视角 · 花束自动旋转展示
          </div>
        </>
      )}
    </div>
  );
};

export default BouquetPreview;
