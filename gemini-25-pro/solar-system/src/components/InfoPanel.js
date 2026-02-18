// src/components/InfoPanel.js
import React from 'react';
import '../InfoPanel.css'; // Importer le CSS

function InfoPanel({ astre, onClose }) {
    // Ne rien rendre si aucun astre n'est sélectionné
    if (!astre) return null;

    // Fonction pour rendre une liste d'informations
    const renderInfoItem = (label, value) => {
        if (!value) return null; // Ne pas afficher si la valeur est vide
        return (
            <li>
                <strong>{label}:</strong> {value}
            </li>
        );
    };

    return (
        <div className="info-panel">
            <button className="close-button" onClick={onClose} title="Fermer">×</button>
            <h2>{astre.name}</h2>

            {/* Affichage dynamique des informations depuis l'objet 'info' */}
            {astre.info?.description && <p>{astre.info.description}</p>}

            <ul>
                {renderInfoItem('Type', astre.info?.type)}
                {renderInfoItem('Diamètre', astre.info?.diametre)}
                {renderInfoItem('Masse', astre.info?.masse)}
                {renderInfoItem('Température de surface', astre.info?.temperatureSurface)}
                {renderInfoItem('Distance moyenne du Soleil', astre.info?.distanceMoyenneSoleil)}
                {renderInfoItem('Période orbitale', astre.info?.periodeOrbitale)}
                {renderInfoItem('Période de rotation', astre.info?.periodeRotation)}
                {renderInfoItem('Faits amusants / Notes', astre.info?.faits)}
            </ul>
        </div>
    );
}

export default InfoPanel;