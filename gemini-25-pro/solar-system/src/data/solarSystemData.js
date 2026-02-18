// src/data/solarSystemData.js

// Échelles APPROXIMATIVES pour la visualisation. AJUSTER SI NÉCESSAIRE.
// Il est impossible de représenter tailles et distances à la même échelle réaliste.
const BASE_RADIUS_SCALE = 0.5; // Facteur pour réduire les rayons
const BASE_DISTANCE_SCALE = 25; // Facteur pour augmenter les distances relatives

export const solarSystemData = [
    {
        id: 'sun',
        name: 'Soleil',
        radius: 696 * BASE_RADIUS_SCALE * 0.05, // Soleil plus grand visuellement
        color: '#FFD700', // Jaune doré
        isStar: true,
        emissive: '#FFD700', // Couleur émise par le soleil
        emissiveIntensity: 1.5, // Intensité de l'émission
        orbitRadius: 0,
        orbitSpeed: 0,
        rotationSpeed: 0.001,
        info: {
            description: "Le Soleil est l'étoile au centre de notre système solaire. C'est une sphère presque parfaite de plasma chaud, dont le mouvement interne crée un champ magnétique.",
            type: "Étoile (Naine jaune)",
            diametre: "1 392 700 km",
            masse: "1,989 × 10^30 kg (environ 333 000 fois la masse de la Terre)",
            temperatureSurface: "environ 5 500 °C",
        }
    },
    {
        id: 'mercury',
        name: 'Mercure',
        radius: 2.4 * BASE_RADIUS_SCALE,
        color: '#AAAAAA', // Grisâtre
        orbitRadius: 58 * BASE_DISTANCE_SCALE * 0.01,
        orbitSpeed: 0.047, // Vitesse relative (plus rapide)
        rotationSpeed: 0.005,
        info: {
            description: "Mercure est la planète la plus petite et la plus proche du Soleil. Elle n'a quasiment pas d'atmosphère et sa surface est marquée par de nombreux cratères.",
            distanceMoyenneSoleil: "57,9 millions km",
            periodeOrbitale: "88 jours terrestres",
            periodeRotation: "58,6 jours terrestres",
            diametre: "4 879 km",
            faits: "Possède des variations de température extrêmes entre le jour et la nuit."
        }
    },
    {
        id: 'venus',
        name: 'Vénus',
        radius: 6 * BASE_RADIUS_SCALE,
        color: '#FFF8DC', // Jaune pâle / Crème
        orbitRadius: 108 * BASE_DISTANCE_SCALE * 0.01,
        orbitSpeed: 0.035,
        rotationSpeed: -0.002, // Rotation rétrograde (très lente)
        info: {
            description: "Vénus est la deuxième planète depuis le Soleil. Elle est similaire en taille à la Terre mais possède une atmosphère épaisse et toxique composée principalement de dioxyde de carbone, créant un effet de serre intense.",
            distanceMoyenneSoleil: "108,2 millions km",
            periodeOrbitale: "225 jours terrestres",
            periodeRotation: "243 jours terrestres (rétrograde)",
            diametre: "12 104 km",
            faits: "C'est la planète la plus chaude du système solaire (environ 465°C)."
        }
    },
    {
        id: 'earth',
        name: 'Terre',
        radius: 6.3 * BASE_RADIUS_SCALE,
        color: '#6495ED', // Bleu Cornflower
        orbitRadius: 150 * BASE_DISTANCE_SCALE * 0.01, // 1 Unité Astronomique (base)
        orbitSpeed: 0.029,
        rotationSpeed: 0.01, // Référence pour les autres
        info: {
            description: "Notre maison ! La Terre est la troisième planète depuis le Soleil et la seule connue pour abriter la vie. Elle possède de l'eau liquide en surface et une atmosphère riche en azote et oxygène.",
            distanceMoyenneSoleil: "149,6 millions km (1 UA)",
            periodeOrbitale: "365,25 jours terrestres",
            periodeRotation: "23 heures 56 minutes",
            diametre: "12 742 km",
            faits: "Possède une lune, et une magnétosphère qui nous protège du vent solaire."
        }
    },
    {
        id: 'mars',
        name: 'Mars',
        radius: 3.4 * BASE_RADIUS_SCALE,
        color: '#FF4500', // Rouge orangé
        orbitRadius: 228 * BASE_DISTANCE_SCALE * 0.01,
        orbitSpeed: 0.024,
        rotationSpeed: 0.0098, // Proche de la Terre
        info: {
            description: "Mars est la quatrième planète depuis le Soleil, souvent appelée la 'Planète Rouge' en raison de l'oxyde de fer présent sur sa surface. Elle possède une atmosphère mince et des calottes polaires.",
            distanceMoyenneSoleil: "227,9 millions km",
            periodeOrbitale: "687 jours terrestres",
            periodeRotation: "24 heures 37 minutes",
            diametre: "6 779 km",
            faits: "Possède les plus hauts volcans (Olympus Mons) et les plus grands canyons du système solaire."
        }
    },
    {
        id: 'jupiter',
        name: 'Jupiter',
        radius: 70 * BASE_RADIUS_SCALE * 0.1, // Échelle réduite pour les géantes
        color: '#FFDEAD', // Navajo White / Beige orangé
        orbitRadius: 778 * BASE_DISTANCE_SCALE * 0.005, // Distance plus grande, échelle réduite
        orbitSpeed: 0.013,
        rotationSpeed: 0.025, // Rotation très rapide
        info: {
            description: "Jupiter est la plus grande planète du système solaire, une géante gazeuse composée principalement d'hydrogène et d'hélium. Elle est connue pour sa Grande Tache Rouge, une tempête anticyclonique persistante.",
            distanceMoyenneSoleil: "778,5 millions km",
            periodeOrbitale: "11,86 années terrestres",
            periodeRotation: "9 heures 55 minutes",
            diametre: "139 820 km",
            faits: "Possède un grand nombre de lunes (plus de 80 connues) et un faible système d'anneaux."
        }
    },
    {
        id: 'saturn',
        name: 'Saturne',
        radius: 58 * BASE_RADIUS_SCALE * 0.1,
        color: '#F4A460', // Sandy Brown / Jaune pâle
        orbitRadius: 1434 * BASE_DISTANCE_SCALE * 0.005,
        orbitSpeed: 0.009,
        rotationSpeed: 0.023, // Rotation rapide
        info: {
            description: "Saturne est la sixième planète, une autre géante gazeuse célèbre pour son système d'anneaux spectaculaire, composé principalement de particules de glace.",
            distanceMoyenneSoleil: "1,43 milliard km",
            periodeOrbitale: "29,45 années terrestres",
            periodeRotation: "10 heures 34 minutes",
            diametre: "116 460 km",
            faits: "Les anneaux s'étendent sur des centaines de milliers de kilomètres mais sont très fins."
        }
        // Note: On ne modélise pas les anneaux ici pour simplifier
    },
    {
        id: 'uranus',
        name: 'Uranus',
        radius: 25 * BASE_RADIUS_SCALE * 0.1,
        color: '#AFEEEE', // Pale Turquoise / Bleu-vert clair
        orbitRadius: 2871 * BASE_DISTANCE_SCALE * 0.005,
        orbitSpeed: 0.006,
        rotationSpeed: 0.013, // Rotation rapide
        info: {
            description: "Uranus est la septième planète, une géante de glace de couleur bleu-vert due au méthane dans son atmosphère. Elle est unique car son axe de rotation est fortement incliné, presque 'couché' sur son plan orbital.",
            distanceMoyenneSoleil: "2,87 milliards km",
            periodeOrbitale: "84 années terrestres",
            periodeRotation: "17 heures 14 minutes (rétrograde due à l'inclinaison)",
            diametre: "50 724 km",
            faits: "Possède un système d'anneaux ténus et de nombreuses lunes."
        }
    },
    {
        id: 'neptune',
        name: 'Neptune',
        radius: 24.5 * BASE_RADIUS_SCALE * 0.1,
        color: '#4682B4', // Steel Blue / Bleu profond
        orbitRadius: 4495 * BASE_DISTANCE_SCALE * 0.005,
        orbitSpeed: 0.005, // La plus lente
        rotationSpeed: 0.015,
        info: {
            description: "Neptune est la huitième et la plus lointaine planète connue du Soleil. C'est une autre géante de glace d'un bleu profond, également colorée par le méthane. Elle connaît les vents les plus violents du système solaire.",
            distanceMoyenneSoleil: "4,5 milliards km",
            periodeOrbitale: "164,8 années terrestres",
            periodeRotation: "16 heures 6 minutes",
            diametre: "49 244 km",
            faits: "Découverte mathématiquement avant d'être observée directement."
        }
    },
];