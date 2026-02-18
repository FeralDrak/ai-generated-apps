// ExplorationFleet.js
import React from 'react';

const ExplorationFleet = ({ fleet, launchProbe, artifacts }) => {
    return (
        <div className="module exploration-fleet">
            <h2>Flotte d'Exploration</h2>
            <div className="fleet-status">
                <div className="starship">
                    <div className="ship-icon kepler"></div>
                    <span>Sondes Kepler: {fleet.keplerProbes}</span>
                </div>
                <div className="starship">
                    <div className="ship-icon ark"></div>
                    <span>Vaisseaux Ark: {fleet.arkShips}</span>
                </div>
                <div className="starship">
                    <div className="ship-icon hawking"></div>
                    <span>Vaisseaux Hawking: {fleet.hawkingVessels}</span>
                </div>
            </div>

            <div className="launch-control">
                <div className="probe">
                    <h3>Sonde Kepler</h3>
                    <p>Rapporte de l'énergie et des minéraux</p>
                    <p>Coût: M:25 É:50</p>
                    <button onClick={() => launchProbe('keplerProbes')}>Lancer</button>
                </div>

                <div className="probe">
                    <h3>Vaisseau Ark</h3>
                    <p>Rapporte des cristaux exotiques</p>
                    <p>Coût: M:100 É:200 C:5</p>
                    <button onClick={() => launchProbe('arkShips')}>Lancer</button>
                </div>

                <div className="probe">
                    <h3>Vaisseau Hawking</h3>
                    <p>Rapporte artefacts et matière noire</p>
                    <p>Coût: M:500 É:1000 C:50</p>
                    <button onClick={() => launchProbe('hawkingVessels')}>Lancer</button>
                </div>
            </div>

            {artifacts > 0 && (
                <div className="artifacts-display">
                    <h3>Artefacts Précurseurs: {artifacts}</h3>
                    <p>Ces artefacts anciens permettent des recherches avancées et l'accès à de nouvelles dimensions</p>
                </div>
            )}
        </div>
    );
};

export default ExplorationFleet;