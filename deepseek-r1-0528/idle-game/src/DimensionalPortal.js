// DimensionalPortal.js
import React, { useState } from 'react';

const DimensionalPortal = ({ portal, openPortal, darkMatter, artifacts, voidEnergy }) => {
    const dimensions = [
        {
            id: "0x7B",
            name: "Dimension 0x7B",
            description: "Accélération temporelle (1min = 5min)",
            cost: { energy: 5000, darkMatter: 5 }
        },
        {
            id: "Ω12",
            name: "Dimension Ω12",
            description: "Ressources exotiques inconnues",
            cost: { exoticCrystals: 25, artifacts: 1 }
        }
    ];

    return (
        <div className="module portal">
            <h2>Portail Interdimensionnel</h2>

            <div className="portal-status">
                <p>Stabilité: {portal.stability}%</p>
                {portal.activeExplorations > 0 && (
                    <p>Explorations en cours: {portal.activeExplorations}</p>
                )}
                {voidEnergy > 0 && (
                    <p className="void-energy">Énergie du Vide: {voidEnergy}</p>
                )}
            </div>

            <div className="dimension-selector">
                {dimensions.map(dim => (
                    <div key={dim.id} className="dimension">
                        <h3>{dim.name}</h3>
                        <p>{dim.description}</p>
                        <div className="cost">
                            Coût:
                            {Object.entries(dim.cost).map(([res, val]) => (
                                <span key={res}>
                  {res === 'darkMatter' ? 'Matière Noire' :
                      res === 'artifacts' ? 'Artefacts' :
                          res === 'exoticCrystals' ? 'Cristaux' :
                              res.charAt(0).toUpperCase()}: {val}
                </span>
                            ))}
                        </div>
                        <button
                            onClick={() => openPortal(dim.id)}
                            disabled={portal.stability > 0 || (
                                Object.entries(dim.cost).some(
                                    ([res, val]) =>
                                        res === 'darkMatter' && darkMatter < val ||
                                        res === 'artifacts' && artifacts < val ||
                                        res === 'exoticCrystals' && voidEnergy < val
                                ))}
                        >
                            Ouvrir le portail
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DimensionalPortal;