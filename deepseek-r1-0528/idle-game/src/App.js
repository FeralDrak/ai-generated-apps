// App.js
import React, { useState, useEffect } from 'react';
import EnergyModule from './EnergyModule';
import ResearchLab from './ResearchLab';
import ExplorationFleet from './ExplorationFleet';
import Nexus from './Nexus';
import DimensionalPortal from './DimensionalPortal';
import ResourceStatus from './ResourceStatus';
import './App.css';

function App() {
  // Resources state
  const [resources, setResources] = useState({
    energy: 100,
    minerals: 50,
    photons: 0,
    darkMatter: 0,
    exoticCrystals: 0,
    artifacts: 0
  });

  // Energy infrastructure
  const [energyBuildings, setEnergyBuildings] = useState({
    solarPanels: 0,
    fusionReactors: 0,
    dysonSpheres: 0
  });

  // Research
  const [technologies, setTechnologies] = useState({
    photonConcentration: false,
    antiNeutrinoCollection: false,
    quantumTelemetry: false,
    molecularReplicators: false
  });

  // Fleet
  const [fleet, setFleet] = useState({
    keplerProbes: 0,
    arkShips: 0,
    hawkingVessels: 0
  });

  // Nexus
  const [nexus, setNexus] = useState({
    engineers: 0,
    scientists: 0,
    androids: 0,
    populationLimit: 10
  });

  // Portal
  const [portal, setPortal] = useState({
    stability: 0,
    openedDimensions: [],
    activeExplorations: 0
  });

  // Game state
  const [gameStats, setGameStats] = useState({
    totalEnergy: 100,
    gameTime: 0,
    resets: 0
  });

  // Update resources every second
  useEffect(() => {
    const gameLoop = setInterval(() => {
      setGameStats(prev => ({
        ...prev,
        gameTime: prev.gameTime + 1
      }));

      // Calculate energy production
      const energyProduction =
          energyBuildings.solarPanels * 2 +
          energyBuildings.fusionReactors * 10 +
          energyBuildings.dysonSpheres * 100 +
          (technologies.photonConcentration ? energyBuildings.solarPanels * 0.2 : 0);

      // Dark matter generation
      const darkMatterGain = technologies.antiNeutrinoCollection ?
          Math.floor(Math.random() * 3) : 0;

      // Update resources
      setResources(prev => ({
        ...prev,
        energy: prev.energy + energyProduction,
        darkMatter: prev.darkMatter + darkMatterGain
      }));

      // Nexus automation
      if (nexus.engineers > 0) {
        const engineerBoost = nexus.engineers * 0.02;
        const currentMineralRate = 1 + (nexus.androids * 0.05);
        setResources(prev => ({
          ...prev,
          minerals: prev.minerals + (currentMineralRate * (1 + engineerBoost))
        }));
      }

      if (nexus.scientists > 0) {
        // Scientists boost creates temporary bonuses
        if (Math.random() < nexus.scientists * 0.15) {
          setResources(prev => ({
            ...prev,
            exoticCrystals: prev.exoticCrystals + 1
          }));
        }
      }

      // Portal effect if open
      if (portal.stability > 0) {
        // Apply time acceleration for specific dimensions
        if (portal.openedDimensions.includes("0x7B")) {
          setResources(prev => ({
            ...prev,
            energy: prev.energy + energyProduction * 4
          }));
        }

        // Random dimension effects
        setPortal(prev => ({
          ...prev,
          stability: Math.max(0, prev.stability - 1)
        }));
      }

    }, 1000);

    return () => clearInterval(gameLoop);
  }, [energyBuildings, technologies, nexus, portal]);

  // Methods to handle actions
  const purchaseBuilding = (building, cost) => {
    if (resources.energy >= cost.energy && resources.minerals >= cost.minerals) {
      setEnergyBuildings(prev => ({
        ...prev,
        [building]: prev[building] + 1
      }));

      setResources(prev => ({
        ...prev,
        energy: prev.energy - cost.energy,
        minerals: prev.minerals - cost.minerals
      }));
    }
  };

  const researchTechnology = (tech, cost, requirements = []) => {
    if (requirements.every(req => technologies[req]) &&
        resources.energy >= cost.energy &&
        resources.exoticCrystals >= cost.exoticCrystals) {
      setTechnologies(prev => ({
        ...prev,
        [tech]: true
      }));

      setResources(prev => ({
        ...prev,
        energy: prev.energy - cost.energy,
        exoticCrystals: prev.exoticCrystals - cost.exoticCrystals
      }));
    }
  };

  const launchProbe = (type) => {
    const costs = {
      keplerProbes: { minerals: 25, energy: 50 },
      arkShips: { minerals: 100, energy: 200, exoticCrystals: 5 },
      hawkingVessels: { minerals: 500, energy: 1000, exoticCrystals: 50 }
    };

    if (Object.entries(costs[type]).every(
        ([resource, amount]) => resources[resource] >= amount
    )) {
      // Subtract costs
      let updatedResources = {...resources};
      Object.entries(costs[type]).forEach(([resource, amount]) => {
        updatedResources[resource] -= amount;
      });

      setResources(updatedResources);

      // Launch probe (will return after some time)
      setTimeout(() => handleReturnedProbe(type), 20000 / fleet[type]);
    }
  };

  const handleReturnedProbe = (type) => {
    // Generate rewards
    const rewards = {
      keplerProbes: () => ({ energy: 100, minerals: 50 }),
      arkShips: () => ({
        exoticCrystals: Math.floor(Math.random() * 5) + 1,
        artifacts: Math.random() > 0.9 ? 1 : 0
      }),
      hawkingVessels: () => ({
        darkMatter: Math.floor(Math.random() * 3) + 1,
        exoticCrystals: Math.floor(Math.random() * 10) + 5,
        artifacts: Math.random() > 0.75 ? 1 : 0
      })
    };

    // Apply rewards
    const newRewards = rewards[type]();
    setResources(prev => {
      const updated = {...prev};
      Object.entries(newRewards).forEach(([resource, amount]) => {
        updated[resource] = (updated[resource] || 0) + amount;
      });
      return updated;
    });

    // Update fleet count
    setFleet(prev => ({
      ...prev,
      [type]: prev[type] - 1
    }));
  };

  const hireNexusUnit = (unit) => {
    const cost = {
      engineers: { minerals: 100, energy: 200 },
      scientists: { minerals: 250, exoticCrystals: 10 },
      androids: { minerals: 500, energy: 1000, exoticCrystals: 5 }
    };

    if (resources.energy >= cost[unit].energy &&
        resources.minerals >= cost[unit].minerals &&
        resources.exoticCrystals >= (cost[unit].exoticCrystals || 0)) {
      setNexus(prev => ({
        ...prev,
        [unit]: prev[unit] + 1
      }));

      setResources(prev => {
        const updated = {...prev};
        updated.energy -= cost[unit].energy || 0;
        updated.minerals -= cost[unit].minerals;
        updated.exoticCrystals -= cost[unit].exoticCrystals || 0;
        return updated;
      });
    }
  };

  const openPortal = (dimension) => {
    if (portal.stability > 0) {
      // Can't open if already unstable
      return;
    }

    const cost = {
      "0x7B": { energy: 5000, darkMatter: 5 },
      "Ω12": { exoticCrystals: 25, artifacts: 1 }
    };

    if (!resources[dimension] ||
        Object.entries(cost[dimension]).every(
            ([resource, amount]) => resources[resource] >= amount
        )) {
      setPortal(prev => ({
        ...prev,
        stability: 100,
        openedDimensions: [...prev.openedDimensions, dimension],
        activeExplorations: prev.activeExplorations + 1
      }));

      // Start dimension exploration timer
      setTimeout(() => voidDimension(dimension), 60000);
    }
  };

  const voidDimension = (dimension) => {
    // Apply dimension rewards
    const rewards = {
      "0x7B": () => ({ energy: 50000 }),
      "Ω12": () => ({
        darkMatter: 15,
        voidEnergy: Math.floor(Math.random() * 5)
      })
    };

    setResources(prev => {
      const updated = {...prev};
      const dimensionRewards = rewards[dimension]();
      Object.entries(dimensionRewards).forEach(([resource, amount]) => {
        updated[resource] = (updated[resource] || 0) + amount;
      });
      return updated;
    });

    // Complete exploration
    setPortal(prev => ({
      ...prev,
      activeExplorations: prev.activeExplorations - 1
    }));
  };

  return (
      <div className="idle-game">
        <header>
          <h1>Stellar Ascension</h1>
          <div className="game-stats">
            <span>Time: {Math.floor(gameStats.gameTime / 60)}m {gameStats.gameTime % 60}s</span>
            <span>Resets: {gameStats.resets}</span>
          </div>
        </header>

        <ResourceStatus resources={resources} />

        <div className="game-modules">
          <EnergyModule
              buildings={energyBuildings}
              purchaseBuilding={purchaseBuilding}
          />

          <ResearchLab
              technologies={technologies}
              researchTechnology={researchTechnology}
              exoticCrystals={resources.exoticCrystals}
          />

          <ExplorationFleet
              fleet={fleet}
              launchProbe={launchProbe}
              artifacts={resources.artifacts}
          />

          <Nexus
              nexus={nexus}
              hireNexusUnit={hireNexusUnit}
          />

          <DimensionalPortal
              portal={portal}
              openPortal={openPortal}
              darkMatter={resources.darkMatter}
              artifacts={resources.artifacts}
              voidEnergy={resources.voidEnergy || 0}
          />
        </div>
      </div>
  );
}

export default App;