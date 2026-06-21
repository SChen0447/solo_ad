const Desk = () => {
  return (
    <group>
      <mesh position={[0, 0.4, 0]} receiveShadow castShadow>
        <boxGeometry args={[2, 0.08, 1]} />
        <meshStandardMaterial color="#c4a882" roughness={0.8} />
      </mesh>

      <mesh position={[-0.9, 0.15, 0.4]} receiveShadow castShadow>
        <boxGeometry args={[0.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#a08060" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 0.15, 0.4]} receiveShadow castShadow>
        <boxGeometry args={[0.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#a08060" roughness={0.9} />
      </mesh>
      <mesh position={[-0.9, 0.15, -0.4]} receiveShadow castShadow>
        <boxGeometry args={[0.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#a08060" roughness={0.9} />
      </mesh>
      <mesh position={[0.9, 0.15, -0.4]} receiveShadow castShadow>
        <boxGeometry args={[0.05, 0.7, 0.05]} />
        <meshStandardMaterial color="#a08060" roughness={0.9} />
      </mesh>

      <group position={[0, 0.85, -0.3]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.8, 0.5, 0.05]} />
          <meshStandardMaterial color="#1f2937" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.1, 0.15, 0.1]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh position={[0, -0.07, 0]} castShadow>
          <boxGeometry args={[0.4, 0.02, 0.25]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh position={[0, 0.25, -0.03]}>
          <boxGeometry args={[0.75, 0.45, 0.01]} />
          <meshStandardMaterial
            color="#60a5fa"
            emissive="#3b82f6"
            emissiveIntensity={0.2}
          />
        </mesh>
      </group>

      <group position={[0, -0.1, -0.8]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <boxGeometry args={[0.6, 0.05, 0.6]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <boxGeometry args={[0.6, 0.6, 0.05]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
        <mesh position={[0, 0.2, -0.28]} castShadow rotation={[0.2, 0, 0]}>
          <boxGeometry args={[0.5, 0.4, 0.05]} />
          <meshStandardMaterial color="#4b5563" />
        </mesh>
        <mesh position={[0, 0.5, 0.28]} castShadow>
          <boxGeometry args={[0.5, 0.1, 0.05]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh position={[0, -0.05, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
        <mesh position={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.5, 0.05, 0.5]} />
          <meshStandardMaterial color="#374151" />
        </mesh>
      </group>
    </group>
  );
};

export default Desk;
