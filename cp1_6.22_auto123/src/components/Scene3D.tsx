import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Desk from './Desk';
import HealthAssistant from './HealthAssistant';
import styles from './Scene3D.module.css';

const Scene3D = () => {
  return (
    <div className={styles.sceneContainer}>
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#f0f4f8']} />

        <ambientLight intensity={0.6} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} />

        <gridHelper args={[10, 10, '#cbd5e1', '#e2e8f0']} position={[0, -0.01, 0]} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#f0f4f8" />
        </mesh>

        <Desk />
        <HealthAssistant />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1.5}
          maxDistance={8}
          target={[0, 0.5, 0]}
          maxPolarAngle={Math.PI / 2 + 0.1}
        />
      </Canvas>
    </div>
  );
};

export default Scene3D;
