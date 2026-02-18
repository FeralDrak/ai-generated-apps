import React, { useState, useRef, useEffect } from 'react';
import './FortuneWheel.css';

const FortuneWheel = ({
                          segments, // Tableau d'objets { text: string, color?: string } ou juste string[]
                          primaryColor = 'black',
                          contrastColor = 'white',
                          buttonText = 'Spin',
                          onSpinStart = () => {},
                          onSpinEnd = (winner) => {},
                          spinDuration = 5, // en secondes
                          showWinner = true,
                          size = 300, // Taille de la roue en pixels
                          textOffset = 0.8, // Position du texte (0 = centre, 1 = bord extérieur)
                          baseSpins = 5, // Nombre minimum de tours complets
                      }) => {
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0); // Rotation actuelle en degrés
    const [winner, setWinner] = useState(null);
    const wheelRef = useRef(null);
    const currentRotationRef = useRef(0); // Garde la trace de la rotation absolue

    const numSegments = segments.length;
    const segmentAngle = 360 / numSegments;
    const radius = size / 2;
    const center = radius;
    const pi = Math.PI;

    // Normaliser les segments pour avoir text et color
    const normalizedSegments = segments.map((seg, index) => {
        if (typeof seg === 'string') {
            // Générer des couleurs si non fournies (cycle simple)
            const defaultColors = ['#FFDD59', '#FF6B6B', '#84DCCF', '#A2D2FF', '#CDB4DB'];
            return { text: seg, color: defaultColors[index % defaultColors.length] };
        }
        return seg;
    });

    // --- Fonctions SVG ---

    // Convertit degrés en radians
    const degToRad = (deg) => (deg * pi) / 180;

    // Calcule les coordonnées sur le cercle
    const getCoord = (angleDeg, r) => {
        const angleRad = degToRad(angleDeg);
        return {
            x: center + r * Math.cos(angleRad),
            y: center + r * Math.sin(angleRad),
        };
    };

    // Génère l'attribut 'd' pour le chemin SVG d'un segment
    const getSegmentPath = (index) => {
        const startAngle = segmentAngle * index - 90; // -90 pour commencer en haut
        const endAngle = startAngle + segmentAngle;

        const start = getCoord(startAngle, radius);
        const end = getCoord(endAngle, radius);

        // Flag pour l'arc SVG (0 si < 180 deg, 1 si >= 180 deg)
        const largeArcFlag = segmentAngle <= 180 ? '0' : '1';

        // M = moveTo, L = lineTo, A = arc, Z = closePath
        return `M ${center},${center} L ${start.x},${start.y} A ${radius},${radius} 0 ${largeArcFlag} 1 ${end.x},${end.y} Z`;
    };

    // Calcule la position et la rotation du texte
    const getTextTransform = (index) => {
        const angleDeg = segmentAngle * index + segmentAngle / 2 - 90; // Centre du segment
        const textRadius = radius * Math.max(0.1, Math.min(1, textOffset)); // Clamp entre 0.1 et 1
        const { x, y } = getCoord(angleDeg, textRadius);
        // Rotation du texte pour qu'il soit orienté vers l'extérieur
        const textRotation = angleDeg + 90;
        return `translate(${x}, ${y}) rotate(${textRotation})`;
    };

    // --- Logique de rotation ---

    const handleSpin = () => {
        if (isSpinning || numSegments === 0) return;

        onSpinStart();
        setIsSpinning(true);
        setWinner(null);

        // Calculer la rotation finale aléatoire
        const randomExtraRotation = Math.random() * 360; // Degrés supplémentaires aléatoires
        const targetRotation = baseSpins * 360 + randomExtraRotation; // Rotation totale
        const finalRotationValue = currentRotationRef.current + targetRotation;

        setRotation(finalRotationValue); // Déclenche l'animation CSS via le style inline

        // Pas besoin de stocker targetIndex, on le calcule à la fin
    };

    const handleTransitionEnd = () => {
        // L'événement peut se déclencher pour d'autres propriétés, filtrons si nécessaire
        // if (event.propertyName !== 'transform') return;

        setIsSpinning(false);

        // Normaliser la rotation finale pour le calcul du gagnant
        const actualRotation = rotation % 360;
        currentRotationRef.current = rotation; // Mettre à jour la rotation absolue pour le prochain tour

        // ----- NOUVEAU CALCUL (Corrigé) -----
        // Le pointeur est en haut (position 0° si on considère le haut comme référence, ou 270°/-90° dans le système SVG utilisé).
        // La rotation 'actualRotation' est dans le sens horaire.
        // L'angle sur la roue (0-360, sens horaire depuis le haut) qui se trouve maintenant sous le pointeur est (360 - actualRotation) % 360.
        const angleSousPointeur = (360 - actualRotation) % 360;

        // Trouver l'index du segment gagnant.
        // Les segments sont indexés 0, 1, 2... dans le sens horaire, commençant par celui qui était initialement en haut.
        // Segment 0 couvre [0, segmentAngle), Segment 1 couvre [segmentAngle, 2*segmentAngle), etc.
        const winnerIndex = Math.floor(angleSousPointeur / segmentAngle);
        // ----- FIN NOUVEAU CALCUL -----


        // Vérification de sécurité au cas où l'index serait hors limites (ne devrait pas arriver)
        const safeWinnerIndex = Math.max(0, Math.min(winnerIndex, numSegments - 1));

        const winningSegment = normalizedSegments[safeWinnerIndex];

        if (winningSegment) {
            setWinner(winningSegment);
            onSpinEnd(winningSegment); // Appeler le callback avec le segment gagnant
        } else {
            console.error("Erreur: Impossible de déterminer le segment gagnant.", { rotation, actualRotation, angleSousPointeur, segmentAngle, winnerIndex });
            onSpinEnd(null); // Ou gérer l'erreur autrement
        }
    };

    // Gérer le cas où les segments changent
    useEffect(() => {
        // Réinitialiser la rotation si les segments changent ? Optionnel.
        setRotation(0);
        currentRotationRef.current = 0;
        setWinner(null);
    }, [segments]); // Se déclenche si la référence du tableau `segments` change

    return (
        <div className="fortune-wheel-container"
             style={{
                 width: size,
                 // height: size, // On peut laisser height être géré par aspect-ratio
                 aspectRatio: '1 / 1', // Force un ratio carré
                 maxWidth: '100%', // Empêche le dépassement si le parent est trop petit
             }}>
            <div className="wheel-pointer" style={{ borderTopColor: primaryColor }}></div>
            <div
                className="wheel"
                ref={wheelRef}
                style={{
                    width: size,
                    height: size,
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? `transform ${spinDuration}s cubic-bezier(0.25, 0.1, 0.25, 1)` : 'none',
                }}
                onTransitionEnd={handleTransitionEnd} // Écoute la fin de la transition CSS
            >
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    style={{ display: 'block' }} // Empêche l'espace blanc sous le SVG
                >
                    <g>
                        {normalizedSegments.map((segment, index) => (
                            <g key={index}>
                                <path
                                    d={getSegmentPath(index)}
                                    fill={segment.color || '#ccc'} // Couleur de secours
                                    stroke={contrastColor} // Bordure entre segments
                                    strokeWidth={1} // Ajustez si nécessaire
                                />
                                <text
                                    transform={getTextTransform(index)}
                                    fill={segment.contrastColor??contrastColor}
                                    fontSize={Math.max(8, Math.min(16, size / 20))} // Taille de police adaptative simple
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    dominantBaseline="middle"
                                >
                                    {/* Tronquer le texte si trop long */}
                                    {segment.text.length > 15 ? segment.text.substring(0, 13) + '...' : segment.text}
                                </text>
                            </g>
                        ))}
                    </g>
                </svg>
            </div>
            <button
                className="spin-button"
                onClick={handleSpin}
                disabled={isSpinning || numSegments === 0}
                style={{ backgroundColor: primaryColor, color: contrastColor }}
            >
                {isSpinning ? '...' : buttonText}
            </button>
            {showWinner && winner && !isSpinning && (
                <div className="winner-display">
                    Gagnant: {winner.text}
                </div>
            )}
        </div>
    );
};

export default FortuneWheel;