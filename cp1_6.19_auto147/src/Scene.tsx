import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { MarineCreature, marineCreatures, getDepthLayer, interpolateColor, EnvironmentData } from './MarineData';

interface SceneProps {
  targetDepth: number;
  selectedCreature: MarineCreature | null;
  onCreatureSelect: (creature: MarineCreature | null) => void;
  onEnvironmentUpdate: (data: EnvironmentData) => void;
  onCameraDirection: (angle: number) => void;
  onCreaturePositionsUpdate: (positions: { id: string; position: THREE.Vector3 }[]) => void;
}

interface CreatureInstance {
  data: MarineCreature;
  group: THREE.Group;
  pathAngle: number;
  pathCenter: THREE.Vector3;
  baseY: number;
  avoidDirection: THREE.Vector3;
  avoidTimer: number;
  parts: THREE.Mesh[];
}

export default function Scene({
  targetDepth,
  selectedCreature,
  onCreatureSelect,
  onEnvironmentUpdate,
  onCameraDirection,
  onCreaturePositionsUpdate
}: SceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const animationIdRef = useRef<number>(0);
  const creaturesRef = useRef<CreatureInstance[]>([]);
  const particlesRef = useRef<THREE.Points | null>(null);
  const deepParticlesRef = useRef<THREE.Points | null>(null);
  const lightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const cameraYRef = useRef<number>(0);
  const targetCameraYRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const previousMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraAngleRef = useRef<number>(0);
  const cameraPitchRef = useRef<number>(0);

  const calculateEnvironment = useCallback((d: number) => {
    const temperature = Math.max(2, 28 - d * 0.05);
    const lightIntensity = Math.max(0.01, 1 - d / 500);
    const pressure = 1 + d / 10;
    const visibility = Math.max(5, 50 - d * 0.09);
    return { temperature, lightIntensity, pressure, visibility };
  }, []);

  const createCreatureModel = useCallback((creature: MarineCreature): THREE.Group => {
    const group = new THREE.Group();
    const parts: THREE.Mesh[] = [];

    const glowColor = interpolateColor(creature.depthRange[0], 0xffd700, 0x00e5ff);

    const mainMaterial = new THREE.MeshPhongMaterial({
      color: creature.color,
      shininess: 50,
      emissive: glowColor,
      emissiveIntensity: 0.2
    });

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: glowColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.BackSide
    });

    switch (creature.modelType) {
      case 'fish': {
        const bodyGeom = new THREE.SphereGeometry(0.5, 16, 12);
        bodyGeom.scale(1, 0.6, 0.5);
        const body = new THREE.Mesh(bodyGeom, mainMaterial);
        body.scale.setScalar(creature.size);
        group.add(body);
        parts.push(body);

        const tailGeom = new THREE.ConeGeometry(0.3, 0.8, 8);
        const tail = new THREE.Mesh(tailGeom, mainMaterial);
        tail.rotation.z = Math.PI / 2;
        tail.position.set(-0.6 * creature.size, 0, 0);
        tail.scale.setScalar(creature.size);
        group.add(tail);
        parts.push(tail);

        const dorsalFinGeom = new THREE.ConeGeometry(0.15, 0.3, 8);
        const dorsalFin = new THREE.Mesh(dorsalFinGeom, mainMaterial);
        dorsalFin.rotation.x = Math.PI;
        dorsalFin.position.set(0, 0.3 * creature.size, 0);
        dorsalFin.scale.setScalar(creature.size);
        group.add(dorsalFin);
        break;
      }
      case 'turtle': {
        const shellGeom = new THREE.SphereGeometry(0.6, 16, 12);
        shellGeom.scale(1, 0.5, 1.2);
        const shell = new THREE.Mesh(shellGeom, mainMaterial);
        shell.scale.setScalar(creature.size);
        group.add(shell);
        parts.push(shell);

        const headGeom = new THREE.SphereGeometry(0.25, 12, 8);
        const head = new THREE.Mesh(headGeom, mainMaterial);
        head.position.set(0.8 * creature.size, -0.1 * creature.size, 0);
        head.scale.setScalar(creature.size);
        group.add(head);
        parts.push(head);

        for (let i = 0; i < 4; i++) {
          const flipperGeom = new THREE.BoxGeometry(0.5, 0.1, 0.3);
          const flipper = new THREE.Mesh(flipperGeom, mainMaterial);
          const angle = (i < 2 ? 1 : -1) * 0.3;
          flipper.rotation.z = angle;
          flipper.position.set(
            (i % 2 === 0 ? 0.4 : -0.4) * creature.size,
            -0.2 * creature.size,
            (i < 2 ? 0.5 : -0.5) * creature.size
          );
          flipper.scale.setScalar(creature.size);
          group.add(flipper);
          parts.push(flipper);
        }
        break;
      }
      case 'shark': {
        const bodyGeom = new THREE.SphereGeometry(0.8, 16, 12);
        bodyGeom.scale(2.5, 0.8, 1);
        const body = new THREE.Mesh(bodyGeom, mainMaterial);
        body.scale.setScalar(creature.size * 0.5);
        group.add(body);
        parts.push(body);

        const headGeom = new THREE.SphereGeometry(0.5, 12, 8);
        headGeom.scale(1.2, 0.9, 1);
        const head = new THREE.Mesh(headGeom, mainMaterial);
        head.position.set(1.5 * creature.size, 0, 0);
        head.scale.setScalar(creature.size * 0.5);
        group.add(head);
        parts.push(head);

        const dorsalFinGeom = new THREE.ConeGeometry(0.4, 1.2, 8);
        const dorsalFin = new THREE.Mesh(dorsalFinGeom, mainMaterial);
        dorsalFin.position.set(0, 0.8 * creature.size, 0);
        dorsalFin.scale.setScalar(creature.size * 0.5);
        group.add(dorsalFin);
        parts.push(dorsalFin);

        const tailGeom = new THREE.ConeGeometry(0.5, 1.5, 8);
        const tail = new THREE.Mesh(tailGeom, mainMaterial);
        tail.rotation.z = -Math.PI / 2;
        tail.position.set(-2 * creature.size, 0, 0);
        tail.scale.setScalar(creature.size * 0.5);
        group.add(tail);
        parts.push(tail);
        break;
      }
      case 'jellyfish': {
        const bellGeom = new THREE.SphereGeometry(0.5, 16, 12);
        bellGeom.scale(1, 0.6, 1);
        const bell = new THREE.Mesh(bellGeom, new THREE.MeshPhongMaterial({
          color: creature.color,
          transparent: true,
          opacity: 0.7,
          emissive: glowColor,
          emissiveIntensity: 0.4
        }));
        bell.scale.setScalar(creature.size);
        group.add(bell);
        parts.push(bell);

        for (let i = 0; i < 8; i++) {
          const tentacleGeom = new THREE.CylinderGeometry(0.02, 0.05, 1, 8);
          const tentacle = new THREE.Mesh(tentacleGeom, new THREE.MeshPhongMaterial({
            color: creature.color,
            transparent: true,
            opacity: 0.6,
            emissive: glowColor,
            emissiveIntensity: 0.5
          }));
          const angle = (i / 8) * Math.PI * 2;
          tentacle.position.set(
              Math.cos(angle) * 0.4 * creature.size,
              -0.5 * creature.size,
              Math.sin(angle) * 0.4 * creature.size
            );
          tentacle.scale.setScalar(creature.size);
          group.add(tentacle);
          parts.push(tentacle);
        }
        break;
      }
      case 'whale': {
        const bodyGeom = new THREE.SphereGeometry(1.5, 16, 12);
        bodyGeom.scale(2, 1, 1);
        const body = new THREE.Mesh(bodyGeom, mainMaterial);
        body.scale.setScalar(creature.size * 0.3);
        group.add(body);
        parts.push(body);

        const headGeom = new THREE.SphereGeometry(1, 16, 12);
        const head = new THREE.Mesh(headGeom, mainMaterial);
        head.position.set(2.5 * creature.size * 0.3, 0, 0);
        head.scale.setScalar(creature.size * 0.3);
        group.add(head);
        parts.push(head);

        const tailGeom = new THREE.ConeGeometry(0.8, 2, 8);
        const tail = new THREE.Mesh(tailGeom, mainMaterial);
        tail.rotation.z = -Math.PI / 2;
        tail.position.set(-3 * creature.size * 0.3, 0, 0);
        tail.scale.setScalar(creature.size * 0.3);
        group.add(tail);
        parts.push(tail);

        const flukeGeom = new THREE.BoxGeometry(1.5, 0.1, 0.8);
        const fluke = new THREE.Mesh(flukeGeom, mainMaterial);
        fluke.position.set(-4 * creature.size * 0.3, 0, 0);
        fluke.scale.setScalar(creature.size * 0.3);
        group.add(fluke);
        parts.push(fluke);
        break;
      }
      case 'dolphin': {
        const bodyGeom = new THREE.SphereGeometry(0.6, 16, 12);
        bodyGeom.scale(2, 0.8, 0.8);
        const body = new THREE.Mesh(bodyGeom, mainMaterial);
        body.scale.setScalar(creature.size * 0.5);
        group.add(body);
        parts.push(body);

        const rostrumGeom = new THREE.ConeGeometry(0.15, 0.8, 8);
        const rostrum = new THREE.Mesh(rostrumGeom, mainMaterial);
        rostrum.rotation.z = -Math.PI / 2;
        rostrum.position.set(1.2 * creature.size * 0.5, 0, 0);
        rostrum.scale.setScalar(creature.size * 0.5);
        group.add(rostrum);
        parts.push(rostrum);

        const dorsalFinGeom = new THREE.ConeGeometry(0.2, 0.6, 8);
        const dorsalFin = new THREE.Mesh(dorsalFinGeom, mainMaterial);
        dorsalFin.rotation.x = Math.PI;
        dorsalFin.position.set(0, 0.5 * creature.size * 0.5, 0);
        dorsalFin.scale.setScalar(creature.size * 0.5);
        group.add(dorsalFin);
        parts.push(dorsalFin);

        const tailGeom = new THREE.ConeGeometry(0.3, 1, 8);
        const tail = new THREE.Mesh(tailGeom, mainMaterial);
        tail.rotation.z = -Math.PI / 2;
        tail.position.set(-1.5 * creature.size * 0.5, 0, 0);
        tail.scale.setScalar(creature.size * 0.5);
        group.add(tail);
        parts.push(tail);
        break;
      }
      case 'octopus': {
        const headGeom = new THREE.SphereGeometry(0.5, 16, 12);
        const head = new THREE.Mesh(headGeom, mainMaterial);
        head.scale.setScalar(creature.size);
        group.add(head);
        parts.push(head);

        for (let i = 0; i < 8; i++) {
          const tentacleGeom = new THREE.CylinderGeometry(0.05, 0.08, 1.2, 8);
          const tentacle = new THREE.Mesh(tentacleGeom, mainMaterial);
          const angle = (i / 8) * Math.PI * 2;
          tentacle.position.set(
            Math.cos(angle) * 0.4 * creature.size,
            -0.3 * creature.size,
            Math.sin(angle) * 0.4 * creature.size
          );
          tentacle.rotation.x = Math.PI / 4 + Math.sin(angle) * 0.3;
          tentacle.rotation.z = angle;
          tentacle.scale.setScalar(creature.size);
          group.add(tentacle);
          parts.push(tentacle);
        }
        break;
      }
      case 'ray': {
        const bodyGeom = new THREE.SphereGeometry(0.8, 16, 12);
        bodyGeom.scale(1, 0.3, 1.5);
        const body = new THREE.Mesh(bodyGeom, mainMaterial);
        body.scale.setScalar(creature.size * 0.8);
        group.add(body);
        parts.push(body);

        const wingGeom = new THREE.BoxGeometry(0.1, 0.05, 2);
        const leftWing = new THREE.Mesh(wingGeom, mainMaterial);
        leftWing.position.set(0, -0.05 * creature.size * 0.8, 1.5 * creature.size * 0.8);
        leftWing.scale.setScalar(creature.size * 0.8);
        group.add(leftWing);
        parts.push(leftWing);

        const rightWing = new THREE.Mesh(wingGeom, mainMaterial);
        rightWing.position.set(0, -0.05 * creature.size * 0.8, -1.5 * creature.size * 0.8);
        rightWing.scale.setScalar(creature.size * 0.8);
        group.add(rightWing);
        parts.push(rightWing);

        const tailGeom = new THREE.CylinderGeometry(0.05, 0.08, 1.5, 8);
        const tail = new THREE.Mesh(tailGeom, mainMaterial);
        tail.rotation.x = Math.PI / 2;
        tail.position.set(-1.2 * creature.size * 0.8, 0, 0);
        tail.scale.setScalar(creature.size * 0.8);
        group.add(tail);
        parts.push(tail);
        break;
      }
    }

    const glowGroup = new THREE.Group();
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const glowMesh = new THREE.Mesh(child.geometry, glowMaterial);
        glowMesh.scale.multiplyScalar(1.1);
        glowGroup.add(glowMesh);
      }
    });
    group.add(glowGroup);

    return group;
  }, []);

  const createSeabed = useCallback((scene: THREE.Scene) => {
    const seabedGeometry = new THREE.PlaneGeometry(200, 200, 50, 50);
    const positions = seabedGeometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 3 + Math.random() * 0.5;
      positions.setZ(i, noise);
    }
    
    seabedGeometry.computeVertexNormals();
    
    const seabedMaterial = new THREE.MeshPhongMaterial({
      color: 0xc2b280,
      shininess: 10
    });
    
    const seabed = new THREE.Mesh(seabedGeometry, seabedMaterial);
    seabed.rotation.x = -Math.PI / 2;
    seabed.position.y = -25;
    scene.add(seabed);

    const coralColors = [0xff6b6b, 0xff8c42, 0xffd93d, 0x6bcb77, 0x4d96ff];
    for (let i = 0; i < 20; i++) {
      const coralGeom = new THREE.ConeGeometry(0.5 + Math.random() * 1, 1 + Math.random() * 2, 6);
      const coral = new THREE.Mesh(
        coralGeom,
        new THREE.MeshPhongMaterial({
          color: coralColors[Math.floor(Math.random() * coralColors.length)],
          shininess: 30
        })
      );
      coral.position.set(
        (Math.random() - 0.5) * 150,
        -24 + Math.random() * 2,
        (Math.random() - 0.5) * 150
      );
      coral.rotation.x = (Math.random() - 0.5) * 0.3;
      coral.rotation.z = (Math.random() - 0.5) * 0.3;
      scene.add(coral);
    }

    for (let i = 0; i < 15; i++) {
      const rockGeom = new THREE.DodecahedronGeometry(0.5 + Math.random() * 1.5, 0);
      const rock = new THREE.Mesh(
        rockGeom,
        new THREE.MeshPhongMaterial({
          color: 0x696969,
          shininess: 5
        })
      );
      rock.position.set(
        (Math.random() - 0.5) * 150,
        -24 + Math.random(),
        (Math.random() - 0.5) * 150
      );
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      scene.add(rock);
    }
  }, []);

  const createParticles = useCallback((scene: THREE.Scene) => {
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const deepPositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 200;
      positions[i + 1] = Math.random() * 50;
      positions[i + 2] = (Math.random() - 0.5) * 200;
      
      deepPositions[i] = (Math.random() - 0.5) * 200;
      deepPositions[i + 1] = -50 + Math.random() * 100;
      deepPositions[i + 2] = (Math.random() - 0.5) * 200;
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.1,
      transparent: true,
      opacity: 0.4
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
    particlesRef.current = particles;

    const deepParticleGeometry = new THREE.BufferGeometry();
    deepParticleGeometry.setAttribute('position', new THREE.BufferAttribute(deepPositions, 3));
    
    const deepParticleMaterial = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8
    });
    
    const deepParticles = new THREE.Points(deepParticleGeometry, deepParticleMaterial);
    scene.add(deepParticles);
    deepParticlesRef.current = deepParticles;
  }, []);

  const createVolumeLight = useCallback((scene: THREE.Scene) => {
    const lightGeometry = new THREE.ConeGeometry(30, 80, 8, 1, true);
    const lightMaterial = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide
    });
    const volumeLight = new THREE.Mesh(lightGeometry, lightMaterial);
    volumeLight.position.set(0, 40, 0);
    volumeLight.rotation.x = Math.PI;
    scene.add(volumeLight);

    const lightBeam = volumeLight;
    return lightBeam;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    scene.fog = new THREE.FogExp2(0x0a1628, 0.01);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 30, 10);
    scene.add(directionalLight);
    lightRef.current = directionalLight;

    const pointLight = new THREE.PointLight(0x88ccff, 0.5, 50);
    pointLight.position.set(0, 20, 0);
    scene.add(pointLight);

    createSeabed(scene);
    createParticles(scene);
    const volumeLight = createVolumeLight(scene);

    const instances: CreatureInstance[] = [];
    marineCreatures.forEach((creatureData, index) => {
      const model = createCreatureModel(creatureData);
      
      const angle = (index / marineCreatures.length) * Math.PI * 2;
      const baseY = -(creatureData.depthRange[0] + creatureData.depthRange[1]) / 2 / 10;
      const centerX = Math.cos(angle) * creatureData.pathRadius * 0.8;
      const centerZ = Math.sin(angle) * creatureData.pathRadius * 0.8;
      
      model.position.set(
        centerX,
        baseY,
        centerZ
      );
      model.rotation.y = angle + Math.PI / 2;
      
      scene.add(model);
      
      instances.push({
        data: creatureData,
        group: model,
        pathAngle: angle,
        pathCenter: new THREE.Vector3(centerX, baseY, centerZ),
        baseY: baseY,
        avoidDirection: new THREE.Vector3(),
        avoidTimer: 0,
        parts: []
      });
    });
    creaturesRef.current = instances;

    cameraYRef.current = 0;
    targetCameraYRef.current = 0;

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const handleMouseDown = (event: MouseEvent) => {
      isDraggingRef.current = true;
      previousMouseRef.current = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (isDraggingRef.current) {
        const deltaX = event.clientX - previousMouseRef.current.x;
        const deltaY = event.clientY - previousMouseRef.current.y;
        cameraAngleRef.current -= deltaX * 0.005;
        cameraPitchRef.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, cameraPitchRef.current - deltaY * 0.005));
        previousMouseRef.current = { x: event.clientX, y: event.clientY };
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !camera || !raycasterRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, camera);
      
      const allMeshes: THREE.Mesh[] = [];
      const meshToCreature = new Map<THREE.Mesh, MarineCreature>();
      
      creaturesRef.current.forEach(instance => {
        instance.group.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            allMeshes.push(child);
            meshToCreature.set(child, instance.data);
          }
        });
      });

      const intersects = raycasterRef.current.intersectObjects(allMeshes, false);
      
      if (intersects.length > 0) {
        const hitObject = intersects[0].object as THREE.Mesh;
        const creature = meshToCreature.get(hitObject);
        if (creature) {
          onCreatureSelect(creature);
        }
      } else {
        onCreatureSelect(null);
      }
    };

    renderer.domElement.addEventListener('mousedown', handleMouseDown);
    renderer.domElement.addEventListener('mousemove', handleMouseMove);
    renderer.domElement.addEventListener('mouseup', handleMouseUp);
    renderer.domElement.addEventListener('mouseleave', handleMouseUp);
    renderer.domElement.addEventListener('click', handleClick);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const deltaTime = 0.016;
      timeRef.current += deltaTime;

      targetCameraYRef.current = -targetDepth / 10;
      cameraYRef.current += (targetCameraYRef.current - cameraYRef.current) * 0.02;

      camera.position.y = cameraYRef.current;
      
      const cameraRadius = 5;
      camera.position.x = Math.sin(cameraAngleRef.current) * cameraRadius;
      camera.position.z = Math.cos(cameraAngleRef.current) * cameraRadius;
      
      const lookAt = new THREE.Vector3(0, cameraYRef.current, 0);
      camera.lookAt(lookAt);

      onCameraDirection(cameraAngleRef.current);

      const currentDepth = -camera.position.y * 10;
      const envData = calculateEnvironment(currentDepth);
      onEnvironmentUpdate(envData);

      const depthLayer = getDepthLayer(currentDepth);
      
      const bgColor = new THREE.Color(depthLayer.ambientColor);
      if (scene.background instanceof THREE.Color) {
        scene.background.lerpColors(new THREE.Color(0x0a1628), bgColor, 0.02);
      }
      
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density += (depthLayer.fogDensity - scene.fog.density) * 0.02;
        scene.fog.color.lerpColors(new THREE.Color(0x0a1628), bgColor, 0.02);
      }

      if (ambientLightRef.current) {
        ambientLightRef.current.intensity += (depthLayer.lightIntensity * 0.5 - ambientLightRef.current.intensity) * 0.02;
      }

      if (lightRef.current) {
        lightRef.current.intensity += (depthLayer.lightIntensity - lightRef.current.intensity) * 0.02;
      }

      if (particlesRef.current) {
        const mat = particlesRef.current.material as THREE.PointsMaterial;
        mat.opacity += (depthLayer.particleDensity * 0.4 - mat.opacity) * 0.02;
      }

      if (deepParticlesRef.current) {
        const mat = deepParticlesRef.current.material as THREE.PointsMaterial;
        const deepOpacity = currentDepth > 200 ? 0.8 : 0;
        mat.opacity += (deepOpacity - mat.opacity) * 0.02;
      }

      volumeLight.rotation.y = Math.sin(timeRef.current * 0.1) * 0.2;

      const positions: { id: string; position: THREE.Vector3 }[] = [];

      creaturesRef.current.forEach((instance) => {
        const creature = instance.data;
        
        instance.pathAngle += creature.swimSpeed * 0.01;
        
        let targetX = instance.pathCenter.x + Math.cos(instance.pathAngle) * creature.pathRadius;
        let targetZ = instance.pathCenter.z + Math.sin(instance.pathAngle) * creature.pathRadius;
        
        const distanceToCamera = Math.sqrt(
          Math.pow(instance.group.position.x - camera.position.x, 2) +
          Math.pow(instance.group.position.z - camera.position.z, 2)
        );

        if (distanceToCamera < 5) {
          if (instance.avoidTimer <= 0) {
            const awayDir = new THREE.Vector3(
              instance.group.position.x - camera.position.x,
              0,
              instance.group.position.z - camera.position.z
            ).normalize();
            instance.avoidDirection.copy(awayDir);
            instance.avoidTimer = 60;
          }
        }
        
        if (instance.avoidTimer > 0) {
          targetX += instance.avoidDirection.x * 3;
          targetZ += instance.avoidDirection.z * 3;
          instance.avoidTimer--;
        }

        instance.group.position.x += (targetX - instance.group.position.x) * 0.05;
        instance.group.position.z += (targetZ - instance.group.position.z) * 0.05;

        instance.group.position.y = instance.baseY + Math.sin(timeRef.current * 0.5) * 0.5;
        
        const moveDir = new THREE.Vector3(
          targetX - instance.group.position.x,
          0,
          targetZ - instance.group.position.z
        ).normalize();
        
        if (moveDir.length() > 0) {
          instance.group.rotation.y = Math.atan2(moveDir.x, moveDir.z) + Math.PI / 2;
        }

        let partIndex = 0;
        instance.group.traverse((child) => {
          if (child instanceof THREE.Mesh && partIndex > 0) {
            child.rotation.y = Math.sin(timeRef.current * creature.swingFrequency + partIndex) * 0.2;
          }
          partIndex++;
        });

        positions.push({
          id: creature.id,
          position: instance.group.position.clone()
        });
      });

      onCreaturePositionsUpdate(positions);

      if (selectedCreature) {
        const selectedInstance = creaturesRef.current.find(c => c.data.id === selectedCreature.id);
        if (selectedInstance) {
          const scale = 1 + Math.sin(timeRef.current * 5) * 0.05;
          selectedInstance.group.scale.setScalar(scale);
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', handleMouseDown);
      renderer.domElement.removeEventListener('mousemove', handleMouseMove);
      renderer.domElement.removeEventListener('mouseup', handleMouseUp);
      renderer.domElement.removeEventListener('mouseleave', handleMouseUp);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [createCreatureModel, createSeabed, createParticles, createVolumeLight, calculateEnvironment, onCreatureSelect, onEnvironmentUpdate, onCameraDirection, onCreaturePositionsUpdate, selectedCreature, targetDepth]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
