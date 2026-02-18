// src/components/SolarSystemCanvas.js
import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Text } from '@react-three/drei';
import CelestialBody from './CelestialBody';

function SolarSystemCanvas({ astresData, onSelectAstre }) {
    const [hoveredAstre, setHoveredAstre] = useState(null);

    return (
        <Canvas camera={{ position: [0, 100, 250], fov: 45 }} style={{ background: '#000010' }}>
            {/* Fallback pendant le chargement (même si pas de textures ici) */}
            <Suspense fallback={<Loading />}>
                {/* Lumière ambiante douce pour éclairer un peu partout */}
                <ambientLight intensity={0.2} />

                {/* Étoiles en arrière-plan pour l'ambiance */}
                <Stars radius={400} depth={60} count={8000} factor={6} saturation={0} fade speed={0.5} />

                {/* Rendu de chaque astre */}
                {astresData.map(astre => (
                    <CelestialBody
                        key={astre.id}
                        data={astre}
                        onSelect={onSelectAstre}
                        // Gérer le survol pour afficher le nom (simplifié)
                        // onPointerOver={(e) => { e.stopPropagation(); setHoveredAstre(astre); }}
                        // onPointerOut={(e) => setHoveredAstre(null)}
                    />
                ))}

                {/* Contrôles pour naviguer (Zoom, Pan, Rotate) */}
                <OrbitControls
                    enablePan={true}
                    enableZoom={true}
                    zoomSpeed={0.8}
                    panSpeed={0.5}
                    rotateSpeed={0.4}
                    minDistance={10}  // Empêche de zoomer trop près
                    maxDistance={1000} // Empêche de dézoomer trop loin
                />

                {/* Affichage du nom au survol (Exemple simple - peut être amélioré) */}
                {/* {hoveredAstre && (
            <Text
              position={[hoveredAstre.orbitRadius + hoveredAstre.radius + 5, 5, 0]} // Position relative
              fontSize={4}
              color="white"
              anchorX="left"
              anchorY="middle"
            >
              {hoveredAstre.name}
            </Text>
        )} */}

            </Suspense>
        </Canvas>
    );
}

// Composant simple pour l'indicateur de chargement
function Loading() {
    return (
        <mesh visible={false}> {/* On pourrait afficher un texte 3D ou autre */}
            <boxGeometry args={[1, 1, 1]}/>
            <meshBasicMaterial wireframe/>
        </mesh>
    );
    // Alternative: un simple div HTML superposé via le CSS
    // return <div className="loading-fallback">Chargement du système solaire...</div>;
}

export default SolarSystemCanvas;