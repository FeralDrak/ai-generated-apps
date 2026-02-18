// ResearchLab.js
import React from 'react';

const ResearchLab = ({ technologies, researchTechnology, exoticCrystals }) => {
    const techData = {
        photonConcentration: {
            name: 'Concentration Photonique',
            description: '+20% efficacité des panneaux solaires',
            cost: { energy: 1000, exoticCrystals: 5 },
            requires: []
        },
        antiNeutrinoCollection: {
            name: 'Collecte d\'Antineutrinos',
            description: 'Génère de la matière noire aléatoirement',
            cost: { energy: 2500, exoticCrystals: 15 },
            requires: ['photonConcentration']
        },
        quantumTelemetry: {
            name: 'Télémétrie Quantique',
            description: '+20% de vitesse d\'exploration',
            cost: { energy: 5000, exoticCrystals: 25 },
            requires: ['photonConcentration']
        },
        molecularReplicators: {
            name: 'Réplicateurs Moléculaires',
            description: '-15% coûts des bâtiments',
            cost: { energy: 10000, exoticCrystals: 50 },
            requires: ['antiNeutrinoCollection']
        }
    };

    return (
        <div className="module research-lab">
            <h2>Laboratoire de Recherche</h2>
            <div className="module-content">
                {Object.entries(techData).map(([techId, tech]) => (
                    <div key={techId} className={`technology ${technologies[techId] ? 'researched' : 'available'}`}>
                        <h3>{tech.name}</h3>
                        <p>{tech.description}</p>
                        <div className="cost">
                            Coût:
                            <span>É: {tech.cost.energy}</span>
                            <span>C: {tech.cost.exoticCrystals}</span>
                        </div>
                        {!technologies[techId] && (
                            <button
                                disabled={!tech.requires.every(req => technologies[req]) || exoticCrystals < tech.cost.exoticCrystals}
                                onClick={() => researchTechnology(techId, tech.cost, tech.requires)}
                            >
                                Rechercher
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ResearchLab;