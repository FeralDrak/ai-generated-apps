// src/App.js
import React, { useState, useCallback } from 'react';
import SolarSystemCanvas from './components/SolarSystemCanvas';
import InfoPanel from './components/InfoPanel';
import { solarSystemData } from './data/solarSystemData';
import './App.css';

function App() {
  // État pour suivre l'astre actuellement sélectionné
  const [selectedAstre, setSelectedAstre] = useState(null);

  // Fonction pour gérer la sélection d'un astre (passée à SolarSystemCanvas)
  // useCallback évite de recréer la fonction à chaque rendu si les dépendances ne changent pas
  const handleSelectAstre = useCallback((astreId) => {
    const astre = solarSystemData.find(a => a.id === astreId);
    // Si on clique sur le même astre, on le désélectionne (facultatif)
    if (selectedAstre && selectedAstre.id === astreId) {
      // setSelectedAstre(null); // Décommenter pour fermer en recliquant
    } else {
      setSelectedAstre(astre);
    }
  }, [selectedAstre]); // Recréer si selectedAstre change

  // Fonction pour fermer le panneau d'information
  const handleClosePanel = useCallback(() => {
    setSelectedAstre(null);
  }, []);

  return (
      <div className="App">
        {/* Le canevas 3D qui affiche le système solaire */}
        <SolarSystemCanvas
            astresData={solarSystemData}
            onSelectAstre={handleSelectAstre}
        />

        {/* Le panneau d'information, affiché seulement si un astre est sélectionné */}
        <InfoPanel
            astre={selectedAstre}
            onClose={handleClosePanel}
        />
      </div>
  );
}

export default App;