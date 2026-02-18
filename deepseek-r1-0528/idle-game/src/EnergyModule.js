// EnergyModule.js
import React from 'react';

const EnergyModule = ({ buildings, purchaseBuilding }) => {
    const buildingCosts = {
        solarPanels: { energy: 50, minerals: 25 },
        fusionReactors: { energy: 500, minerals: 250 },
        dysonSpheres: { energy: 10000, minerals: 5000, exoticCrystals: 5 }
    };

    return (
        <div className="module energy-module">
            <h2>Énergie Stellaire</h2>
            <div className="module-content">
                <div className="building">
                    <h3>Panneaux Solaires: {buildings.solarPanels}</h3>
                    <p>Production: 2 énergie/sec</p>
                    <button onClick={() => purchaseBuilding('solarPanels', buildingCosts.solarPanels)}>
                        Acheter (É: {buildingCosts.solarPanels.energy} M: {buildingCosts.solarPanels.minerals})
                    </button>
                </div>

                <div className="building">
                    <h3>Réacteurs à Fusion: {buildings.fusionReactors}</h3>
                    <p>Production: 10 énergie/sec</p>
                    <button onClick={() => purchaseBuilding('fusionReactors', buildingCosts.fusionReactors)}>
                        Acheter (É: {buildingCosts.fusionReactors.energy} M: {buildingCosts.fusionReactors.minerals})
                    </button>
                </div>

                <div className="building">
                    <h3>Sphères de Dyson: {buildings.dysonSpheres}</h3>
                    <p>Production: 100 énergie/sec</p>
                    <button onClick={() => purchaseBuilding('dysonSpheres', buildingCosts.dysonSpheres)}>
                        Acheter (É: {buildingCosts.dysonSpheres.energy} M: {buildingCosts.dysonSpheres.minerals} C: {buildingCosts.dysonSpheres.exoticCrystals})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EnergyModule;