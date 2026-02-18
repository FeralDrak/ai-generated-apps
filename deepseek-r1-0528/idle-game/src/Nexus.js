// Nexus.js
import React from 'react';

const Nexus = ({ nexus, hireNexusUnit }) => {
    return (
        <div className="module nexus">
            <h2>Nexus d'Ascension</h2>
            <div className="population-status">
                <p>Unités déployées: {nexus.engineers + nexus.scientists + nexus.androids}/{nexus.populationLimit}</p>
            </div>

            <div className="nexus-units">
                <div className="unit">
                    <div className="unit-icon engineer"></div>
                    <h3>Ingénieurs: {nexus.engineers}</h3>
                    <p>Boost production de minéraux</p>
                    <button onClick={() => hireNexusUnit('engineers')}>
                        Recruter (M:100 É:200)
                    </button>
                </div>

                <div className="unit">
                    <div className="unit-icon scientist"></div>
                    <h3>Scientifiques: {nexus.scientists}</h3>
                    <p>Peut générer des cristaux aléatoirement</p>
                    <button onClick={() => hireNexusUnit('scientists')}>
                        Recruter (M:250 C:10)
                    </button>
                </div>

                <div className="unit">
                    <div className="unit-icon android"></div>
                    <h3>Androïdes: {nexus.androids}</h3>
                    <p>Réduit les coûts énergétiques</p>
                    <button onClick={() => hireNexusUnit('androids')}>
                        Construire (M:500 É:1000 C:5)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Nexus;