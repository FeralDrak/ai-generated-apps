// src/components/CelestialBody.js
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function CelestialBody({ data, onSelect }) {
    const meshRef = useRef(); // Référence pour l'astre lui-même (rotation axiale)
    const orbitRef = useRef(); // Référence pour le groupe gérant l'orbite

    // Animation à chaque frame
    useFrame((state, delta) => {
        // Rotation axiale (sur lui-même)
        if (meshRef.current && data.rotationSpeed) {
            meshRef.current.rotation.y += data.rotationSpeed * delta * 5; // Vitesse ajustable
        }
        // Révolution orbitale (autour du centre)
        if (orbitRef.current && data.orbitSpeed) {
            orbitRef.current.rotation.y += data.orbitSpeed * delta * 2; // Vitesse ajustable
        }
    });

    const handlePointerOver = (e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer'; // Change le curseur
    };

    const handlePointerOut = (e) => {
        document.body.style.cursor = 'auto'; // Remet le curseur par défaut
    };

    const handleClick = (e) => {
        e.stopPropagation(); // Empêche le clic de déclencher OrbitControls
        onSelect(data.id); // Appelle la fonction de sélection passée en prop
        // Optionnel: Animer la caméra vers l'astre cliqué (plus avancé)
        // const camera = e.camera;
        // const targetPosition = new THREE.Vector3();
        // meshRef.current.getWorldPosition(targetPosition);
        // // Animer la caméra vers targetPosition...
    };

    return (
        // Groupe pour gérer l'orbite autour du centre (0,0,0)
        <group ref={orbitRef}>
            {/* La maille (mesh) représentant l'astre */}
            <mesh
                ref={meshRef}
                position={[data.orbitRadius, 0, 0]} // Position sur l'axe X initialement
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                {/* La forme géométrique : une sphère */}
                <sphereGeometry args={[data.radius, 32, 32]} />

                {/* Le matériau : couleur et propriétés lumineuses */}
                <meshStandardMaterial
                    color={data.color}
                    emissive={data.emissive || '#000000'} // Lumière émise (pour le soleil)
                    emissiveIntensity={data.emissiveIntensity || 0} // Intensité de l'émission
                    roughness={data.isStar ? 0.2 : 0.8} // Soleil moins rugueux, planètes plus
                    metalness={0.1} // Un peu métallique
                />
                {/* Lumière ponctuelle émise par le Soleil lui-même */}
                {data.isStar && <pointLight intensity={2.5} distance={1000} decay={2} color={data.emissive} />}
            </mesh>

            {/* Visualisation de l'orbite (Optionnel) */}
            {data.orbitRadius > 0 && (
                <mesh rotation={[Math.PI / 2, 0, 0]}> {/* Tourné pour être sur le plan XZ */}
                    <ringGeometry args={[data.orbitRadius - 0.1, data.orbitRadius + 0.1, 128]} />
                    <meshBasicMaterial color="#555" side={THREE.DoubleSide} transparent opacity={0.3}/>
                </mesh>
            )}
        </group>
    );
}

export default CelestialBody;