import React, { useState } from 'react';
import './App.css';

// Données simplifiées sur les astres
const astres = [
  {
    nom: "Soleil",
    rayon: 696_340,
    distance: 0,
    periode: 0,
    description: "Le Soleil est l'étoile au centre du système solaire, fournissant lumière et chaleur.",
    couleur: "#FFD700"
  },
  {
    nom: "Mercure",
    rayon: 2_439,
    distance: 58,
    periode: 88,
    description: "Mercure est la planète la plus proche du Soleil et la plus rapide.",
    couleur: "#b1b1b1"
  },
  {
    nom: "Vénus",
    rayon: 6_052,
    distance: 108,
    periode: 225,
    description: "Vénus est la planète la plus chaude avec une atmosphère épaisse de CO₂.",
    couleur: "#e6d8ad"
  },
  {
    nom: "Terre",
    rayon: 6_371,
    distance: 150,
    periode: 365,
    description: "La Terre est la planète bleue, seule connue pour abriter la vie.",
    couleur: "#4F92FF"
  },
  {
    nom: "Mars",
    rayon: 3_390,
    distance: 228,
    periode: 687,
    description: "Mars, la planète rouge, possède le plus haut volcan du système solaire.",
    couleur: "#ff984f"
  },
  {
    nom: "Jupiter",
    rayon: 69_911,
    distance: 779,
    periode: 4332,
    description: "Jupiter est la plus grosse planète, célèbre pour sa Grande Tache Rouge.",
    couleur: "#e2c690"
  },
  {
    nom: "Saturne",
    rayon: 58_232,
    distance: 1433,
    periode: 10759,
    description: "Saturne est célèbre pour son système d’anneaux impressionnant.",
    couleur: "#f6e8b1"
  },
  {
    nom: "Uranus",
    rayon: 25_362,
    distance: 2877,
    periode: 30687,
    description: "Uranus, unique par son inclinaison axiale extrême.",
    couleur: "#a6e8ed"
  },
  {
    nom: "Neptune",
    rayon: 24_622,
    distance: 4503,
    periode: 60190,
    description: "Neptune est la planète la plus éloignée du Soleil.",
    couleur: "#485cff"
  }
];

// Composant Fiche Astre
function FicheAstre({ astre, onClose }) {
  if (!astre) return null;
  return (
      <div className="fiche-astre">
        <button onClick={onClose} className="close-btn">X</button>
        <h2>{astre.nom}</h2>
        <p>{astre.description}</p>
        <ul>
          <li><strong>Rayon :</strong> {astre.rayon.toLocaleString()} km</li>
          {astre.distance !== 0 && (
              <li><strong>Distance au Soleil :</strong> {astre.distance.toLocaleString()} millions de km</li>
          )}
          {astre.periode !== 0 && (
              <li><strong>Période orbitale :</strong> {astre.periode.toLocaleString()} jours</li>
          )}
        </ul>
      </div>
  );
}

// Composant principal
function App() {
  const [astreSel, setAstreSel] = useState(null);

  // Animation : Angle d'orbite
  const [angle, setAngle] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setAngle(a => a + 0.01), 16);
    return () => clearInterval(id);
  }, []);

  // ‘Constellation’ position des planètes en orbite
  const tailleMaxOrbite = 220; // en px, pour Neptune
  const orbes = astres.slice(1).map((astre, idx) => {
    const anglePlanete = angle * (astre.periode ? 365 / astre.periode : 1) + idx;
    const rayonOrbite = tailleMaxOrbite * (astre.distance / astres.slice(-1)[0].distance);

    const x = Math.cos(anglePlanete) * rayonOrbite;
    const y = Math.sin(anglePlanete) * rayonOrbite;

    return (
        <React.Fragment key={astre.nom}>
          {/* L'orbite */}
          <div
              className="orbite"
              style={{
                width: rayonOrbite * 2,
                height: rayonOrbite * 2,
                left: '50%',
                top: '50%',
                marginLeft: -rayonOrbite,
                marginTop: -rayonOrbite
              }}
          />
          {/* Planète */}
          <div
              className="planete"
              title={astre.nom}
              style={{
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                background: astre.couleur,
                width: Math.max(24, Math.log(astre.rayon) * 2),
                height: Math.max(24, Math.log(astre.rayon) * 2)
              }}
              onClick={() => setAstreSel(astre)}
          >
          </div>
        </React.Fragment>
    );
  });

  // Soleil au centre
  const soleil = astres[0];

  return (
      <div className="app">
        <h1>Le Système solaire interactif 🌞🪐</h1>
        <p>Clique sur un astre pour afficher les informations !</p>
        <div className="systeme-solaire">
          {/* Soleil */}
          <div
              className="planete soleil"
              style={{
                background: soleil.couleur,
                left: '50%',
                top: '50%',
                width: 70,
                height: 70,
                boxShadow: '0 0 60px 20px #ffec8c'
              }}
              onClick={() => setAstreSel(soleil)}
              title="Soleil"
          ></div>
          {/* Orbits et planètes */}
          {orbes}
        </div>
        {/* Fiche informative */}
        <FicheAstre astre={astreSel} onClose={() => setAstreSel(null)} />
        <footer>
          <small>Conçu avec React · Exemples pédagogiques – Vous pouvez ajouter satellites, lunes, etc.</small>
        </footer>
      </div>
  );
}

export default App;