import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Ingredient {
  name: string;
  category: string;
  color: string;
  shape: string;
  status: string;
  position: number;
}

interface Tool {
  name: string;
  type: string;
  color: string;
}

interface Action {
  name: string;
  action: string;
  duration: number;
}

interface Step {
  id: number;
  description: string;
  actions: Action[];
  ingredients: string[];
  tools: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

interface Scene3DProps {
  ingredients: Ingredient[];
  tools: Tool[];
  currentStep: Step | undefined;
  isPlaying: boolean;
  onObjectClick: (obj: { name: string; type: 'ingredient' | 'tool'; status: string; position: { x: number; y: number } }) => void;
  onAnimationComplete: () => void;
}

interface IngredientMeshProps {
  ingredient: Ingredient;
  position: [number, number, number];
  isActive: boolean;
  actionType: string;
  onHover: (name: string | null) => void;
  onClick: (name: string) => void;
}

const IngredientMesh: React.FC<IngredientMeshProps> = ({ ingredient, position, isActive, actionType, onHover, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const animationProgress = useRef(0);
  const initialScale = useRef<number>(ingredient.shape === 'sphere' ? 0.6 : 0.8);
  const initialPosition = useRef<[number, number, number]>([...position]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (isActive) {
      animationProgress.current = Math.min(animationProgress.current + delta * 1.5, 1);
    } else {
      animationProgress.current = Math.max(animationProgress.current - delta * 2, 0);
    }

    const t = animationProgress.current;

    switch (actionType) {
      case 'dice':
      case 'slice':
      case 'shred':
      case 'chop': {
        const scale = initialScale.current * (1 - t * 0.4);
        meshRef.current.scale.setScalar(scale);
        const bounce = Math.sin(t * Math.PI * 4) * 0.1 * (1 - t);
        meshRef.current.position.y = initialPosition.current[1] + bounce;
        break;
      }
      case 'fry':
      case 'stir_fry': {
        const wobble = Math.sin(Date.now() * 0.008) * 0.05;
        meshRef.current.rotation.z = wobble;
        const color = new THREE.Color(ingredient.color);
        const cookedColor = new THREE.Color(ingredient.color).multiplyScalar(0.7);
        const currentColor = color.clone().lerp(cookedColor, t);
        if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
          meshRef.current.material.color = currentColor;
        }
        break;
      }
      case 'simmer':
      case 'boil':
      case 'steam': {
        const bob = Math.sin(Date.now() * 0.003 + position[0]) * 0.05;
        meshRef.current.position.y = initialPosition.current[1] + bob + t * 0.1;
        break;
      }
      case 'add':
      case 'pour': {
        meshRef.current.position.x = initialPosition.current[0] - t * 2;
        meshRef.current.position.y = initialPosition.current[1] + t * 0.5;
        break;
      }
      case 'serve': {
        meshRef.current.position.x = initialPosition.current[0] + t * 3;
        meshRef.current.position.y = initialPosition.current[1] + t * 1.5;
        meshRef.current.scale.setScalar(initialScale.current * (1 - t * 0.3));
        break;
      }
      default:
        meshRef.current.position.set(...initialPosition.current);
        meshRef.current.scale.setScalar(initialScale.current);
    }

    if (hovered) {
      meshRef.current.scale.setScalar(initialScale.current * 1.1);
    }
  });

  useEffect(() => {
    if (meshRef.current && meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.color.set(ingredient.color);
    }
  }, [ingredient.color]);

  const getGeometry = () => {
    switch (ingredient.shape) {
      case 'sphere':
        return <sphereGeometry args={[1, 32, 32]} />;
      case 'cylinder':
        return <cylinderGeometry args={[0.7, 0.7, 1.5, 32]} />;
      case 'box':
      default:
        return <boxGeometry args={[1.2, 1, 1.2]} />;
    }
  };

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        onPointerOver={(e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          setHovered(true);
          onHover(ingredient.name);
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          setHovered(false);
          onHover(null);
          document.body.style.cursor = 'default';
        }}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onClick(ingredient.name);
        }}
        castShadow
      >
        {getGeometry()}
        <meshStandardMaterial
          color={ingredient.color}
          roughness={0.5}
          metalness={0.1}
          emissive={hovered ? ingredient.color : '#000000'}
          emissiveIntensity={hovered ? 0.2 : 0}
        />
      </mesh>
      {(hovered || isActive) && (
        <Html position={[position[0], position[1] + 1.5, position[2]]} center>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {ingredient.name}
          </div>
        </Html>
      )}
    </group>
  );
};

interface ToolMeshProps {
  tool: Tool;
  position: [number, number, number];
  isActive: boolean;
  actionType: string;
  onHover: (name: string | null) => void;
  onClick: (name: string) => void;
}

const ToolMesh: React.FC<ToolMeshProps> = ({ tool, position, isActive, actionType, onHover, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const animationPhase = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (isActive) {
      animationPhase.current += delta * 3;

      switch (actionType) {
        case 'dice':
        case 'slice':
        case 'shred':
        case 'chop':
          if (tool.type === 'knife') {
            const chop = Math.abs(Math.sin(animationPhase.current * 2)) * 0.8;
            groupRef.current.rotation.x = -0.5 - chop * 0.8;
            groupRef.current.position.y = position[1] - chop * 0.4;
          }
          break;
        case 'stir_fry':
        case 'fry':
          if (tool.type === 'spatula') {
            const stir = Math.sin(animationPhase.current) * 0.5;
            groupRef.current.rotation.y = stir;
            groupRef.current.position.x = position[0] + stir * 0.5;
          }
          if (tool.type === 'pan') {
            const shake = Math.sin(animationPhase.current * 1.5) * 0.05;
            groupRef.current.rotation.z = shake;
          }
          break;
        case 'simmer':
        case 'boil':
        case 'steam':
          if (tool.type === 'pan') {
            groupRef.current.rotation.z = Math.sin(animationPhase.current * 0.5) * 0.02;
          }
          break;
        default:
          break;
      }
    }
  });

  const renderTool = () => {
    switch (tool.type) {
      case 'pan':
        return (
          <group>
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[2.5, 2, 0.3, 32]} />
              <meshStandardMaterial color={tool.color} metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.15, 0]}>
              <cylinderGeometry args={[2.3, 2.3, 0.1, 32]} />
              <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} />
            </mesh>
            <mesh position={[2.8, 0.1, 0]} rotation={[0, 0, -0.3]}>
              <cylinderGeometry args={[0.15, 0.15, 1.5, 16]} />
              <meshStandardMaterial color="#5a3921" roughness={0.8} />
            </mesh>
          </group>
        );
      case 'knife':
        return (
          <group rotation={[-0.5, 0, 0]}>
            <mesh position={[0, 0.3, 0]} castShadow>
              <boxGeometry args={[0.1, 1.5, 0.04]} />
              <meshStandardMaterial color={tool.color} metalness={0.9} roughness={0.2} />
            </mesh>
            <mesh position={[0, -0.5, 0]}>
              <boxGeometry args={[0.15, 0.4, 0.1]} />
              <meshStandardMaterial color="#5a3921" roughness={0.7} />
            </mesh>
          </group>
        );
      case 'board':
        return (
          <group>
            <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
              <boxGeometry args={[3, 0.2, 2]} />
              <meshStandardMaterial color={tool.color} roughness={0.9} />
            </mesh>
            <mesh position={[0, -0.15, 0]}>
              <boxGeometry args={[2.8, 0.1, 1.8]} />
              <meshStandardMaterial color="#6b4423" roughness={0.9} />
            </mesh>
          </group>
        );
      case 'bowl':
        return (
          <group>
            <mesh position={[0, 0, 0]} castShadow>
              <sphereGeometry args={[1.2, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color={tool.color} metalness={0.3} roughness={0.4} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      case 'plate':
        return (
          <group>
            <mesh position={[0, 0, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[1.5, 1.3, 0.15, 32]} />
              <meshStandardMaterial color={tool.color} metalness={0.2} roughness={0.3} />
            </mesh>
          </group>
        );
      case 'spatula':
        return (
          <group rotation={[0.3, 0, 0]}>
            <mesh position={[0, 0.5, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 1.5, 16]} />
              <meshStandardMaterial color="#5a3921" roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.5, 0]}>
              <boxGeometry args={[0.6, 0.8, 0.05]} />
              <meshStandardMaterial color={tool.color} metalness={0.8} roughness={0.3} />
            </mesh>
          </group>
        );
      default:
        return (
          <mesh castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={tool.color} />
          </mesh>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        onHover(tool.name);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        onHover(null);
        document.body.style.cursor = 'default';
      }}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick(tool.name);
      }}
    >
      {renderTool()}
      {(hovered || isActive) && (
        <Html position={[0, 2, 0]} center>
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            {tool.name}
          </div>
        </Html>
      )}
    </group>
  );
};

const SceneContent: React.FC<{
  ingredients: Ingredient[];
  tools: Tool[];
  currentStep: Step | undefined;
  onObjectClick: (obj: { name: string; type: 'ingredient' | 'tool'; status: string; position: { x: number; y: number } }) => void;
  onAnimationComplete: () => void;
}> = ({ ingredients, tools, currentStep, onObjectClick, onAnimationComplete }) => {
  const [, setHoveredObject] = useState<string | null>(null);
  const animationTimer = useRef<number | null>(null);

  const activeIngredients = useMemo(() => {
    return currentStep?.ingredients || [];
  }, [currentStep]);

  const activeTools = useMemo(() => {
    return currentStep?.tools || [];
  }, [currentStep]);

  const currentAction = currentStep?.actions[0]?.action || '';

  useEffect(() => {
    if (currentStep && currentStep.status === 'in_progress') {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
      const duration = currentStep.actions[0]?.duration || 2000;
      animationTimer.current = window.setTimeout(() => {
        onAnimationComplete();
      }, duration + 500);
    }
    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
    };
  }, [currentStep, onAnimationComplete]);

  const getIngredientPositions = (): Record<string, [number, number, number]> => {
    const positions: Record<string, [number, number, number]> = {};
    const shouldPutInPan = ['fry', 'stir_fry', 'simmer', 'boil', 'steam', 'mix'].includes(currentAction);

    ingredients.forEach((ing, idx) => {
      if (shouldPutInPan && activeIngredients.includes(ing.name)) {
        const inPanIndex = activeIngredients.indexOf(ing.name);
        const angle = (inPanIndex / activeIngredients.length) * Math.PI * 2;
        positions[ing.name] = [Math.cos(angle) * 0.8, 0.3, Math.sin(angle) * 0.8];
      } else {
        const x = (idx - ingredients.length / 2) * 1.5;
        positions[ing.name] = [x, 0.5, 0];
      }
    });
    return positions;
  };

  const getToolPositions = (): Record<string, [number, number, number]> => {
    const positions: Record<string, [number, number, number]> = {};
    let offset = 0;

    tools.forEach((tool) => {
      switch (tool.type) {
        case 'pan':
          positions[tool.name] = [0, -0.3, 0];
          break;
        case 'board':
          positions[tool.name] = [-4, -0.6, 0];
          break;
        case 'knife':
          positions[tool.name] = [-4, 0.8, 1];
          break;
        case 'spatula':
          positions[tool.name] = [3, 0.5, 1];
          break;
        case 'bowl':
        case 'plate':
          positions[tool.name] = [4, -0.2, 0];
          break;
        default:
          positions[tool.name] = [offset * 2 - 2, 0, 0];
          offset++;
      }
    });
    return positions;
  };

  const ingredientPositions = getIngredientPositions();
  const toolPositions = getToolPositions();

  const handleIngredientClick = (name: string) => {
    const ing = ingredients.find(i => i.name === name);
    if (ing) {
      onObjectClick({
        name,
        type: 'ingredient',
        status: ing.status,
        position: { x: 0, y: 0 }
      });
    }
  };

  const handleToolClick = (name: string) => {
    const tool = tools.find(t => t.name === name);
    if (tool) {
      onObjectClick({
        name,
        type: 'tool',
        status: '可用',
        position: { x: 0, y: 0 }
      });
    }
  };

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#ffd700" />
      <pointLight position={[5, 3, 5]} intensity={0.3} color="#87ceeb" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#2d3436" roughness={0.9} />
      </mesh>

      <mesh position={[0, -0.95, 0]} receiveShadow>
        <boxGeometry args={[12, 0.1, 6]} />
        <meshStandardMaterial color="#636e72" roughness={0.8} />
      </mesh>

      {tools.map((tool) => (
        <ToolMesh
          key={tool.name}
          tool={tool}
          position={toolPositions[tool.name] || [0, 0, 0]}
          isActive={activeTools.includes(tool.name) && currentStep?.status === 'in_progress'}
          actionType={currentAction}
          onHover={setHoveredObject}
          onClick={handleToolClick}
        />
      ))}

      {ingredients.map((ing) => (
        <IngredientMesh
          key={ing.name}
          ingredient={ing}
          position={ingredientPositions[ing.name] || [0, 0, 0]}
          isActive={activeIngredients.includes(ing.name) && currentStep?.status === 'in_progress'}
          actionType={currentAction}
          onHover={setHoveredObject}
          onClick={handleIngredientClick}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={15}
        target={[0, 0, 0]}
      />
    </>
  );
};

const Scene3D: React.FC<Scene3DProps> = ({ ingredients, tools, currentStep, onObjectClick, onAnimationComplete }) => {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Canvas
        shadows
        camera={{ position: [0, 4, 8], fov: 50 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#1a1a2e']} />
        <fog attach="fog" args={['#1a1a2e', 10, 20]} />
        <SceneContent
          ingredients={ingredients}
          tools={tools}
          currentStep={currentStep}
          onObjectClick={onObjectClick}
          onAnimationComplete={onAnimationComplete}
        />
      </Canvas>

      {currentStep && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          padding: '12px 24px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          fontSize: '14px',
          maxWidth: '60%',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#e94560', marginBottom: '4px' }}>
            步骤 {currentStep.id}
          </div>
          <div style={{ fontWeight: 500 }}>{currentStep.description}</div>
        </div>
      )}

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '8px',
        fontSize: '12px',
        color: '#888'
      }}>
        <span>🖱️ 拖拽旋转</span>
        <span>•</span>
        <span>滚轮缩放</span>
        <span>•</span>
        <span>点击查看详情</span>
      </div>
    </div>
  );
};

export default Scene3D;
