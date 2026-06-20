import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Constellation } from './constellationData';
import './SceneComponent.css';

interface SceneComponentProps {
  selectedConstellation: Constellation | null;
  onInfoCardHide: () => void;
}

const generateBackgroundStars = (count: number, radius: number) => {
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * Math.cbrt(Math.random());

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const isLarge = Math.random() > 0.7;
    sizes[i] = isLarge ? 3.5 : 1.8;

    const brightness = isLarge ? 1.0 : 0.8;
    const colorVariation = 0.85 + Math.random() * 0.3;
    colors[i * 3] = brightness * colorVariation;
    colors[i * 3 + 1] = brightness * (colorVariation * 0.95);
    colors[i * 3 + 2] = brightness * colorVariation;
  }

  return { positions, sizes, colors };
};

const BackgroundStars = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const { positions, sizes, colors } = useMemo(
    () => generateBackgroundStars(1500, 2500),
    []
  );

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, sizes, colors]);

  const material = useMemo(() => {
    return new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9
    });
  }, []);

  return <points ref={pointsRef} geometry={geometry} material={material} />;
};

interface ConstellationMeshProps {
  constellation: Constellation;
  isSelected: boolean;
}

const ConstellationMesh = ({ constellation, isSelected }: ConstellationMeshProps) => {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);

  const { starPositions, linePositions } = useMemo(() => {
    const starPos = new Float32Array(constellation.stars.length * 3);
    const linePos: number[] = [];

    constellation.stars.forEach((star, i) => {
      starPos[i * 3] = star[0];
      starPos[i * 3 + 1] = star[1];
      starPos[i * 3 + 2] = star[2];
    });

    constellation.connections.forEach(([start, end]) => {
      const startStar = constellation.stars[start];
      const endStar = constellation.stars[end];
      if (startStar && endStar) {
        linePos.push(startStar[0], startStar[1], startStar[2]);
        linePos.push(endStar[0], endStar[1], endStar[2]);
      }
    });

    return { starPositions: starPos, linePositions: new Float32Array(linePos) };
  }, [constellation]);

  const starColor = isSelected ? new THREE.Color(0xFFD700) : new THREE.Color(0x8899BB);
  const starMaterial = useMemo(() => {
    return new THREE.PointsMaterial({
      color: starColor,
      size: isSelected ? 8 : 4,
      transparent: true,
      opacity: isSelected ? 1 : 0.7,
      sizeAttenuation: true
    });
  }, [isSelected, starColor]);

  const lineColor = isSelected ? new THREE.Color(0xFFFFFF) : new THREE.Color(0x446688);
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: lineColor,
      linewidth: isSelected ? 1.5 : 1,
      transparent: true,
      opacity: isSelected ? 0.9 : 0.4
    });
  }, [isSelected, lineColor]);

  const starGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    return geo;
  }, [starPositions]);

  const lineGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    return geo;
  }, [linePositions]);

  return (
    <group>
      <points ref={pointsRef} geometry={starGeometry} material={starMaterial} />
      <lineSegments ref={linesRef} geometry={lineGeometry} material={lineMaterial} />
    </group>
  );
};

interface CameraControllerProps {
  targetPosition: THREE.Vector3 | null;
}

const CameraController = ({ targetPosition }: CameraControllerProps) => {
  const { camera, gl } = useThree();
  const isDragging = useRef(false);
  const previousMouse = useRef({ x: 0, y: 0 });
  const rotationVelocity = useRef({ x: 0, y: 0 });
  const isAnimating = useRef(false);
  const animationTarget = useRef<THREE.Vector3 | null>(null);
  const animationProgress = useRef(0);
  const startPosition = useRef(new THREE.Vector3());

  useEffect(() => {
    if (targetPosition) {
      animationTarget.current = targetPosition.clone().normalize().multiplyScalar(3000);
      startPosition.current.copy(camera.position);
      animationProgress.current = 0;
      isAnimating.current = true;
      rotationVelocity.current = { x: 0, y: 0 };
    }
  }, [targetPosition, camera]);

  useEffect(() => {
    const canvas = gl.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        isDragging.current = true;
        isAnimating.current = false;
        previousMouse.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || isAnimating.current) return;

      const deltaX = e.clientX - previousMouse.current.x;
      const deltaY = e.clientY - previousMouse.current.y;

      rotationVelocity.current.x = deltaY * 0.005;
      rotationVelocity.current.y = deltaX * 0.005;

      previousMouse.current = { x: e.clientX, y: e.clientY };
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const currentDistance = camera.position.length();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const newDistance = Math.max(1500, Math.min(7500, currentDistance * zoomFactor));
      camera.position.normalize().multiplyScalar(newDistance);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [gl, camera]);

  useFrame((_, delta) => {
    if (isAnimating.current && animationTarget.current) {
      animationProgress.current += delta / 1.5;

      if (animationProgress.current >= 1) {
        animationProgress.current = 1;
        isAnimating.current = false;
      }

      const t = animationProgress.current;
      const easeT = 1 - Math.pow(1 - t, 3);

      const newPos = new THREE.Vector3().lerpVectors(
        startPosition.current,
        animationTarget.current,
        easeT
      );
      camera.position.copy(newPos);
      camera.lookAt(0, 0, 0);
    } else if (!isDragging.current) {
      rotationVelocity.current.x *= 0.95;
      rotationVelocity.current.y *= 0.95;

      if (Math.abs(rotationVelocity.current.x) > 0.0001 || Math.abs(rotationVelocity.current.y) > 0.0001) {
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3().crossVectors(camera.position, up).normalize();

        const quaternionX = new THREE.Quaternion().setFromAxisAngle(right, rotationVelocity.current.x);
        const quaternionY = new THREE.Quaternion().setFromAxisAngle(up, rotationVelocity.current.y);

        camera.position.applyQuaternion(quaternionX);
        camera.position.applyQuaternion(quaternionY);
        camera.lookAt(0, 0, 0);
      }
    }
  });

  return null;
};

interface SceneContentProps {
  constellations: Constellation[];
  selectedConstellation: Constellation | null;
  targetPosition: THREE.Vector3 | null;
}

const SceneContent = ({ constellations, selectedConstellation, targetPosition }: SceneContentProps) => {
  return (
    <>
      <ambientLight intensity={0.3} />
      <BackgroundStars />
      {constellations.map((constellation) => (
        <ConstellationMesh
          key={constellation.id}
          constellation={constellation}
          isSelected={selectedConstellation?.id === constellation.id}
        />
      ))}
      <CameraController targetPosition={targetPosition} />
    </>
  );
};

const SceneComponent = ({ selectedConstellation, onInfoCardHide }: SceneComponentProps) => {
  const [targetPosition, setTargetPosition] = useState<THREE.Vector3 | null>(null);
  const [showInfoCard, setShowInfoCard] = useState(false);
  const infoCardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (selectedConstellation) {
      const firstStar = selectedConstellation.stars[0];
      if (firstStar) {
        const target = new THREE.Vector3(firstStar[0], firstStar[1], firstStar[2]);
        setTargetPosition(target);
      }

      if (infoCardTimeoutRef.current) {
        clearTimeout(infoCardTimeoutRef.current);
      }

      setShowInfoCard(false);

      infoCardTimeoutRef.current = setTimeout(() => {
        setShowInfoCard(true);
      }, 1500);
    } else {
      setShowInfoCard(false);
      if (infoCardTimeoutRef.current) {
        clearTimeout(infoCardTimeoutRef.current);
      }
    }

    return () => {
      if (infoCardTimeoutRef.current) {
        clearTimeout(infoCardTimeoutRef.current);
      }
    };
  }, [selectedConstellation]);

  const handleCloseCard = useCallback(() => {
    setShowInfoCard(false);
    onInfoCardHide();
  }, [onInfoCardHide]);

  return (
    <div className="scene-container">
      <Canvas
        camera={{ position: [0, 0, 3000], fov: 60, near: 1, far: 10000 }}
        gl={{ antialias: true }}
        onCreated={({ gl, scene }) => {
          gl.setClearColor(new THREE.Color(0x0B0B2B));
          scene.fog = new THREE.FogExp2(0x0B0B2B, 0.0001);
        }}
      >
        <SceneContent
          constellations={[]}
          selectedConstellation={selectedConstellation}
          targetPosition={targetPosition}
        />
      </Canvas>

      {selectedConstellation && showInfoCard && (
        <div className="info-card">
          <button className="close-button" onClick={handleCloseCard}>×</button>
          <h2 className="info-card-title">{selectedConstellation.name}</h2>
          <p className="info-card-latin">{selectedConstellation.latinName}</p>
          <div className="info-card-divider"></div>
          <h3 className="info-card-subtitle">主要恒星</h3>
          <ul className="info-card-stars">
            {selectedConstellation.mainStars.map((star, index) => (
              <li key={index} className="info-card-star-item">
                <span className="star-name">{star.name}</span>
                <span className="star-magnitude">视星等: {star.magnitude}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SceneComponent;
