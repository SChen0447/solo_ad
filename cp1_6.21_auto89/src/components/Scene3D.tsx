import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { GraphNode, Edge } from '../types';
import {
  getNodeRadius,
  createGlowTexture,
  hexToRgb,
  smoothCameraTransition,
  getCameraTargetForNode,
  createAnimatedLineMaterial,
} from '../utils/sceneUtils';

interface Scene3DProps {
  nodes: GraphNode[];
  edges: Edge[];
  themeColor: string;
  selectedNodeId: string | null;
  autoRotate: boolean;
  onNodeClick: (nodeId: string) => void;
  onNodeSelect: (node: GraphNode | null) => void;
  focusNodeId: string | null;
  onCameraTransitionComplete?: () => void;
}

interface NodeMeshData {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  labelSprite: THREE.Sprite;
  originalScale: number;
  baseMaterial: THREE.MeshStandardMaterial;
}

interface EdgeMeshData {
  line: THREE.Line;
  material: THREE.ShaderMaterial;
  sourceId: string;
  targetId: string;
}

export default function Scene3D({
  nodes,
  edges,
  themeColor,
  selectedNodeId,
  autoRotate,
  onNodeClick,
  onNodeSelect,
  focusNodeId,
  onCameraTransitionComplete,
}: Scene3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const nodeMeshesRef = useRef<Map<string, NodeMeshData>>(new Map());
  const edgeMeshesRef = useRef<EdgeMeshData[]>([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const animationFrameRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const nodeMapRef = useRef<Map<string, GraphNode>>(new Map());
  const selectedNodeRef = useRef<string | null>(null);
  const autoRotateRef = useRef(false);
  const isTransitioningRef = useRef(false);
  const fpsCounterRef = useRef({ lastTime: 0, frames: 0, fps: 0 });

  const createTextTexture = useCallback((text: string, color: string = '#ffffff') => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontSize = 32;
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    canvas.width = Math.ceil(textWidth + 40);
    canvas.height = fontSize + 20;

    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = gradient;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const createNodeMesh = useCallback(
    (node: GraphNode, themeColor: string) => {
      const radius = getNodeRadius(node.importance);
      const rgb = hexToRgb(themeColor);

      const geometry = new THREE.SphereGeometry(radius, 48, 48);

      const material = new THREE.MeshStandardMaterial({
        color: new THREE.Color(rgb.r, rgb.g, rgb.b),
        metalness: 0.8,
        roughness: 0.2,
        emissive: new THREE.Color(rgb.r * 0.3, rgb.g * 0.3, rgb.b * 0.3),
        emissiveIntensity: 0.5,
      });

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(...node.position);
      sphere.userData.nodeId = node.id;
      sphere.userData.nodeType = 'main';

      const glowTexture = createGlowTexture(themeColor);
      const glowMaterial = new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const glowSprite = new THREE.Sprite(glowMaterial);
      glowSprite.scale.set(radius * 3.5, radius * 3.5, 1);
      glowSprite.position.copy(sphere.position);
      glowSprite.userData.nodeId = node.id;
      glowSprite.userData.nodeType = 'glow';

      const textTexture = createTextTexture(node.title, themeColor);
      const labelMaterial = new THREE.SpriteMaterial({
        map: textTexture,
        transparent: true,
        depthWrite: false,
      });

      const labelSprite = new THREE.Sprite(labelMaterial);
      const aspectRatio = textTexture.image.width / textTexture.image.height;
      const labelHeight = 0.8;
      labelSprite.scale.set(labelHeight * aspectRatio, labelHeight, 1);
      labelSprite.position.set(
        sphere.position.x,
        sphere.position.y + radius + 0.6,
        sphere.position.z
      );
      labelSprite.userData.nodeId = node.id;
      labelSprite.userData.nodeType = 'label';

      return {
        mesh: sphere,
        glowMesh: glowSprite as unknown as THREE.Mesh,
        labelSprite,
        originalScale: radius,
        baseMaterial: material,
      };
    },
    [createTextTexture]
  );

  const createEdgeMesh = useCallback(
    (edge: Edge, nodePositions: Map<string, THREE.Vector3>, themeColor: string) => {
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);
      if (!sourcePos || !targetPos) return null;

      const points: THREE.Vector3[] = [];
      const segments = 32;
      const direction = new THREE.Vector3()
        .subVectors(targetPos, sourcePos)
        .normalize();
      const perpendicular = new THREE.Vector3(
        -direction.y,
        direction.x,
        0
      ).normalize();
      const distance = sourcePos.distanceTo(targetPos);
      const arcHeight = Math.min(distance * 0.15, 1.5);

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const point = new THREE.Vector3().lerpVectors(sourcePos, targetPos, t);
        const offset = Math.sin(t * Math.PI) * arcHeight;
        point.add(perpendicular.clone().multiplyScalar(offset));
        points.push(point);
      }

      const geometry = new THREE.BufferGeometry().setFromPoints(points);

      const uvs = new Float32Array(geometry.attributes.position.count * 2);
      for (let i = 0; i < geometry.attributes.position.count; i++) {
        uvs[i * 2] = i / (geometry.attributes.position.count - 1);
        uvs[i * 2 + 1] = 0.5;
      }
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

      const material = createAnimatedLineMaterial(themeColor);

      const line = new THREE.Line(geometry, material);
      line.userData.edgeId = edge.id;

      return {
        line,
        material,
        sourceId: edge.source,
        targetId: edge.target,
      };
    },
    []
  );

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      const meshes = Array.from(nodeMeshesRef.current.values()).map((data) => data.mesh);
      const intersects = raycasterRef.current.intersectObjects(meshes);

      if (intersects.length > 0) {
        const nodeId = intersects[0].object.userData.nodeId as string;
        onNodeClick(nodeId);
      } else {
        onNodeSelect(null);
      }
    },
    [onNodeClick, onNodeSelect]
  );

  const updateNodeFocus = useCallback(
    (focusId: string | null) => {
      if (!sceneRef.current) return;

      const relatedIds = new Set<string>();
      if (focusId) {
        relatedIds.add(focusId);
        const focusNode = nodeMapRef.current.get(focusId);
        if (focusNode) {
          focusNode.connections.forEach((connId) => relatedIds.add(connId));
        }
        edgeMeshesRef.current.forEach((edgeData) => {
          if (edgeData.sourceId === focusId || edgeData.targetId === focusId) {
            relatedIds.add(edgeData.sourceId);
            relatedIds.add(edgeData.targetId);
          }
        });
      }

      nodeMeshesRef.current.forEach((data, nodeId) => {
        const isRelated = !focusId || relatedIds.has(nodeId);
        const opacity = isRelated ? 1 : 0.3;

        data.baseMaterial.transparent = !isRelated;
        data.baseMaterial.opacity = opacity;

        const glowMaterial = data.glowMesh.material as THREE.SpriteMaterial;
        glowMaterial.opacity = opacity;

        const labelMaterial = data.labelSprite.material as THREE.SpriteMaterial;
        labelMaterial.opacity = opacity;
      });

      edgeMeshesRef.current.forEach((edgeData) => {
        const isHighlighted =
          !focusId ||
          (edgeData.sourceId === focusId || edgeData.targetId === focusId);
        edgeData.material.uniforms.flowSpeed.value = isHighlighted ? 3.0 : 0.5;
        edgeData.material.opacity = isHighlighted ? 1 : 0.3;
      });
    },
    []
  );

  const focusOnNode = useCallback(
    async (nodeId: string) => {
      if (!cameraRef.current || !controlsRef.current || isTransitioningRef.current) return;

      const nodeData = nodeMeshesRef.current.get(nodeId);
      if (!nodeData) return;

      isTransitioningRef.current = true;
      const targetPosition = getCameraTargetForNode(nodeData.mesh.position, 6);
      const targetLookAt = nodeData.mesh.position.clone();

      await smoothCameraTransition(
        cameraRef.current,
        controlsRef.current,
        targetPosition,
        targetLookAt,
        800
      );

      isTransitioningRef.current = false;
      onCameraTransitionComplete?.();
    },
    [onCameraTransitionComplete]
  );

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e1a);
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(12, 8, 12);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x0a0e1a);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI * 0.9;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = false;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8080ff, 0.4);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(themeColor, 1, 50);
    rimLight.position.set(0, 10, 0);
    scene.add(rimLight);

    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 1000;
    const positions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 100;
      positions[i + 1] = (Math.random() - 0.5) * 100;
      positions[i + 2] = (Math.random() - 0.5) * 100;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particlesMaterial = new THREE.PointsMaterial({
      color: 0x444466,
      size: 0.1,
      transparent: true,
      opacity: 0.6,
    });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const elapsed = clockRef.current.getElapsedTime();

      if (controlsRef.current && autoRotateRef.current && !isTransitioningRef.current) {
        controlsRef.current.autoRotate = true;
        controlsRef.current.autoRotateSpeed = 0.5;
      } else if (controlsRef.current) {
        controlsRef.current.autoRotate = false;
      }

      controlsRef.current?.update();

      nodeMeshesRef.current.forEach((data, nodeId) => {
        data.mesh.rotation.y += delta * 0.3;
        data.glowMesh.rotation.z += delta * 0.2;

        if (selectedNodeRef.current === nodeId) {
          const breathScale = 1 + Math.sin(elapsed * 3) * 0.1;
          data.mesh.scale.setScalar(breathScale);
          data.glowMesh.scale.setScalar(data.originalScale * 3.5 * breathScale * 1.2);
          data.baseMaterial.emissiveIntensity = 1 + Math.sin(elapsed * 4) * 0.3;
        } else {
          const breathScale = 1 + Math.sin(elapsed * 2 + data.originalScale) * 0.03;
          data.mesh.scale.setScalar(breathScale);
          data.glowMesh.scale.setScalar(data.originalScale * 3.5 * breathScale);
          data.baseMaterial.emissiveIntensity = 0.5;
        }
      });

      edgeMeshesRef.current.forEach((edgeData) => {
        edgeData.material.uniforms.time.value = elapsed;
      });

      particles.rotation.y += delta * 0.05;

      renderer.render(scene, camera);

      const now = performance.now();
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        fpsCounterRef.current.fps = fpsCounterRef.current.frames;
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }
    };
    animate();

    renderer.domElement.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      cancelAnimationFrame(animationFrameRef.current);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [handleClick, themeColor]);

  useEffect(() => {
    if (!sceneRef.current) return;

    nodeMeshesRef.current.forEach((data) => {
      sceneRef.current?.remove(data.mesh);
      sceneRef.current?.remove(data.glowMesh);
      sceneRef.current?.remove(data.labelSprite);
      data.mesh.geometry.dispose();
      (data.mesh.material as THREE.Material).dispose();
      (data.glowMesh.material as THREE.Material).dispose();
      (data.labelSprite.material as THREE.Material).dispose();
    });
    nodeMeshesRef.current.clear();

    edgeMeshesRef.current.forEach((data) => {
      sceneRef.current?.remove(data.line);
      data.line.geometry.dispose();
      data.material.dispose();
    });
    edgeMeshesRef.current = [];

    nodeMapRef.current.clear();
    nodes.forEach((node) => nodeMapRef.current.set(node.id, node));

    const nodePositions = new Map<string, THREE.Vector3>();
    nodes.forEach((node) => {
      nodePositions.set(node.id, new THREE.Vector3(...node.position));
    });

    nodes.forEach((node) => {
      const nodeData = createNodeMesh(node, themeColor);
      sceneRef.current?.add(nodeData.mesh);
      sceneRef.current?.add(nodeData.glowMesh);
      sceneRef.current?.add(nodeData.labelSprite);
      nodeMeshesRef.current.set(node.id, nodeData);
    });

    edges.forEach((edge) => {
      const edgeData = createEdgeMesh(edge, nodePositions, themeColor);
      if (edgeData) {
        sceneRef.current?.add(edgeData.line);
        edgeMeshesRef.current.push(edgeData);
      }
    });

    updateNodeFocus(null);
  }, [nodes, edges, themeColor, createNodeMesh, createEdgeMesh, updateNodeFocus]);

  useEffect(() => {
    selectedNodeRef.current = selectedNodeId;
    updateNodeFocus(selectedNodeId);
  }, [selectedNodeId, updateNodeFocus]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    if (focusNodeId) {
      focusOnNode(focusNodeId);
    }
  }, [focusNodeId, focusOnNode]);

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
