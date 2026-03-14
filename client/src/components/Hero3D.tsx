import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Environment, ContactShadows, PresentationControls } from "@react-three/drei";
import { useRef } from "react";
import * as THREE from "three";

function FloatingShape({ position, scale, speed, floatIntensity, rotationIntensity, color, type }: any) {
    const mesh = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (mesh.current) {
            mesh.current.rotation.x = Math.sin(state.clock.elapsedTime * speed) * 0.2;
            mesh.current.rotation.y = Math.cos(state.clock.elapsedTime * speed) * 0.2;
        }
    });

    return (
        <Float speed={speed} floatIntensity={floatIntensity} rotationIntensity={rotationIntensity}>
            <mesh ref={mesh} position={position} scale={scale} castShadow receiveShadow>
                {type === "icosahedron" && <icosahedronGeometry args={[1, 0]} />}
                {type === "torus" && <torusGeometry args={[1, 0.3, 16, 32]} />}
                {type === "sphere" && <sphereGeometry args={[1, 32, 32]} />}
                {type === "cylinder" && <cylinderGeometry args={[0.5, 0.5, 1.5, 32]} />}

                <meshStandardMaterial
                    color={color}
                    roughness={0.1}
                    metalness={0.8}
                    envMapIntensity={2}
                />
            </mesh>
        </Float>
    );
}

export default function Hero3D() {
    return (
        <div className="absolute inset-0 z-0 w-full h-full pointer-events-none sm:pointer-events-auto">
            <Canvas shadows camera={{ position: [0, 0, 10], fov: 45 }}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
                <spotLight position={[-10, -10, -10]} angle={0.15} penumbra={1} intensity={0.5} color="#bef202" />

                <PresentationControls
                    global
                    snap
                    rotation={[0, 0.3, 0]}
                    polar={[-Math.PI / 3, Math.PI / 3]}
                    azimuth={[-Math.PI / 1.4, Math.PI / 2]}
                >
                    <group position={[0, -0.5, 0]}>
                        <FloatingShape
                            type="icosahedron"
                            position={[-3, 1, -2]}
                            scale={1.2}
                            speed={1.5}
                            floatIntensity={2}
                            rotationIntensity={2}
                            color="#bef202"
                        />
                        <FloatingShape
                            type="torus"
                            position={[3.5, 2, -1]}
                            scale={0.8}
                            speed={2}
                            floatIntensity={3}
                            rotationIntensity={1}
                            color="#ffffff"
                        />
                        <FloatingShape
                            type="sphere"
                            position={[2, -1.5, 1]}
                            scale={0.6}
                            speed={1}
                            floatIntensity={1.5}
                            rotationIntensity={1}
                            color="#1a1a1a"
                        />
                        <FloatingShape
                            type="cylinder"
                            position={[-2, -1, 1]}
                            scale={0.5}
                            speed={1.2}
                            floatIntensity={2.5}
                            rotationIntensity={2}
                            color="#ffffff"
                        />
                    </group>
                </PresentationControls>

                <ContactShadows
                    position={[0, -3.5, 0]}
                    opacity={0.4}
                    scale={20}
                    blur={2}
                    far={10}
                    color="#000000"
                />

                <Environment preset="city" />
            </Canvas>
        </div>
    );
}
