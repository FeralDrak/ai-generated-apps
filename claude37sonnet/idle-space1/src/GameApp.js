import React, { useState, useEffect } from 'react';
import { Rocket, Beaker, Globe, Building, Zap, ChevronUp, Plus, AlertTriangle, Award } from 'lucide-react';

// Styles
const styles = {
    container: 'flex flex-col h-screen bg-gray-900 text-white',
    header: 'flex justify-between items-center p-4 bg-gray-800',
    title: 'text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600',
    tabsContainer: 'flex bg-gray-800 border-b border-gray-700',
    tab: 'px-4 py-2 cursor-pointer transition-colors duration-200',
    activeTab: 'px-4 py-2 cursor-pointer bg-gray-700 border-t-2 border-blue-500',
    content: 'flex-1 overflow-y-auto p-4 h-full',
    resourceBar: 'flex justify-between bg-gray-800 p-2 rounded mb-4 gap-2 flex-wrap',
    resourceItem: 'flex items-center bg-gray-700 rounded px-3 py-1',
    resourceIcon: 'mr-2',
    upgradeBtn: 'px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded ml-2 flex items-center',
    cardGrid: 'grid grid-cols-1 md:grid-cols-2 gap-4',
    card: 'bg-gray-800 rounded-lg overflow-hidden border border-gray-700',
    cardHeader: 'bg-gray-700 p-3 flex justify-between items-center',
    cardTitle: 'font-bold flex items-center',
    cardBody: 'p-4',
    progressContainer: 'h-2 bg-gray-700 rounded overflow-hidden mt-2',
    progressBar: 'h-full bg-blue-500',
    btn: 'px-4 py-2 rounded font-medium transition-colors duration-200',
    primaryBtn: 'bg-blue-600 hover:bg-blue-700 text-white',
    disabledBtn: 'bg-gray-600 text-gray-400 cursor-not-allowed',
    techTree: 'flex flex-col gap-4',
    techItem: 'bg-gray-700 p-3 rounded border border-gray-600',
    requirementText: 'text-xs text-gray-400 mt-1',
    eventNotification: 'p-4 bg-gray-800 border-l-4 border-yellow-500 rounded mb-4',
    planetGrid: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4',
    planetCard: 'bg-gray-800 rounded-lg p-4 border border-gray-700 cursor-pointer',
    colonyGrid: 'grid grid-cols-1 sm:grid-cols-2 gap-4',
    alienRace: 'flex items-center p-3 bg-gray-800 rounded mb-2 border border-gray-700',
};

const GameApp = () => {
    // --- Game State ---
    const [activeTab, setActiveTab] = useState('resources');
    const [lastTick, setLastTick] = useState(Date.now());
    const [speedMultiplier, setSpeedMultiplier] = useState(1); // For testing: set higher to speed up gameplay
    const [notifications, setNotifications] = useState([]);

    // Resources
    const [resources, setResources] = useState({
        energy: 10,
        minerals: 10,
        rareElements: 0,
        science: 0,
        cosmicData: 0,
        alienArtifacts: 0,
        colonists: 10,
    });

    // Resource generators
    const [generators, setGenerators] = useState({
        solarPanel: { level: 1, baseCost: 10, costMultiplier: 1.1, baseProduction: 0.5, resource: 'energy' },
        miningRig: { level: 1, baseCost: 10, costMultiplier: 1.1, baseProduction: 0.5, resource: 'minerals' },
        scanner: { level: 0, baseCost: 50, costMultiplier: 1.15, baseProduction: 0.2, resource: 'rareElements' },
        researchLab: { level: 0, baseCost: 40, costMultiplier: 1.2, baseProduction: 0.3, resource: 'science' },
    });

    // Research
    const [technologies, setTechnologies] = useState({
        automatedMining: {
            name: 'Automated Mining',
            level: 0,
            maxLevel: 3,
            cost: 25,
            costMultiplier: 2,
            effect: 'miningRig',
            effectValue: 1.5,
            requirements: {},
            description: 'Enhance mining rigs with AI systems to increase mineral production.'
        },
        advancedEnergySystems: {
            name: 'Advanced Energy Systems',
            level: 0,
            maxLevel: 3,
            cost: 25,
            costMultiplier: 2,
            effect: 'solarPanel',
            effectValue: 1.5,
            requirements: {},
            description: 'Improve solar panels with high-efficiency photovoltaic cells.'
        },
        spaceExploration: {
            name: 'Space Exploration',
            level: 0,
            maxLevel: 1,
            cost: 50,
            costMultiplier: 0,
            effect: 'unlockExploration',
            effectValue: 1,
            requirements: {},
            description: 'Develop the technology needed for interplanetary exploration.'
        },
        quantumScanning: {
            name: 'Quantum Scanning',
            level: 0,
            maxLevel: 2,
            cost: 80,
            costMultiplier: 2,
            effect: 'scanner',
            effectValue: 2,
            requirements: { spaceExploration: 1 },
            description: 'Use quantum technology to improve rare element detection.'
        },
        colonization: {
            name: 'Colonization Technology',
            level: 0,
            maxLevel: 1,
            cost: 120,
            costMultiplier: 0,
            effect: 'unlockColonization',
            effectValue: 1,
            requirements: { spaceExploration: 1 },
            description: 'Develop the technology needed to establish colonies on other planets.'
        },
        xenoLinguistics: {
            name: 'Xeno-Linguistics',
            level: 0,
            maxLevel: 1,
            cost: 150,
            costMultiplier: 0,
            effect: 'unlockAlienContact',
            effectValue: 1,
            requirements: { spaceExploration: 1 },
            description: 'Develop methods to communicate with alien civilizations.'
        },
        advancedHabitation: {
            name: 'Advanced Habitation',
            level: 0,
            maxLevel: 2,
            cost: 200,
            costMultiplier: 1.8,
            effect: 'colonyCapacity',
            effectValue: 1.5,
            requirements: { colonization: 1 },
            description: 'Improve colony habitats to support more colonists.'
        },
        alienArtifactAnalysis: {
            name: 'Alien Artifact Analysis',
            level: 0,
            maxLevel: 2,
            cost: 250,
            costMultiplier: 1.8,
            effect: 'alienArtifactBonus',
            effectValue: 0.5,
            requirements: { xenoLinguistics: 1 },
            description: 'Study alien artifacts to gain scientific knowledge.'
        },
    });

    // Exploration
    const [exploration, setExploration] = useState({
        enabled: false,
        currentMission: null,
        planetarySystemsDiscovered: 0,
        maxPlanetarySystems: 12,
        ships: 1,
        explorationSpeed: 1,
    });

    const [planetarySystems] = useState([
        { id: 'alpha', name: 'Alpha Centauri', distance: 4.3, difficulty: 1, explored: false,
            resources: { minerals: 20, rareElements: 5, alienArtifacts: 0 },
            description: 'Closest star system to Earth with potentially habitable planets.' },
        { id: 'barnard', name: 'Barnard\'s Star', distance: 5.9, difficulty: 1, explored: false,
            resources: { minerals: 25, rareElements: 3, alienArtifacts: 0 },
            description: 'A low-mass red dwarf with a suspected exoplanet.' },
        { id: 'wolf359', name: 'Wolf 359', distance: 7.8, difficulty: 2, explored: false,
            resources: { minerals: 30, rareElements: 8, alienArtifacts: 0 },
            description: 'One of the lowest-mass stars known with potential for resources.' },
        { id: 'sirius', name: 'Sirius System', distance: 8.6, difficulty: 2, explored: false,
            resources: { minerals: 35, rareElements: 10, alienArtifacts: 0 },
            description: 'The brightest star in Earth\'s night sky with a white dwarf companion.' },
        { id: 'eridani', name: 'Epsilon Eridani', distance: 10.5, difficulty: 3, explored: false,
            resources: { minerals: 40, rareElements: 15, alienArtifacts: 0 },
            description: 'Young star with a planetary system and asteroid belt.' },
        { id: 'procyon', name: 'Procyon System', distance: 11.4, difficulty: 3, explored: false,
            resources: { minerals: 45, rareElements: 12, alienArtifacts: 0 },
            description: 'Binary star system with potential for unusual planetary formations.' },
        { id: 'tau', name: 'Tau Ceti', distance: 11.9, difficulty: 4, explored: false,
            resources: { minerals: 50, rareElements: 18, alienArtifacts: 0 },
            description: 'Sun-like star with multiple planets in the habitable zone.' },
        { id: 'luyten', name: 'Luyten\'s Star', distance: 12.3, difficulty: 4, explored: false,
            resources: { minerals: 55, rareElements: 20, alienArtifacts: 1 },
            description: 'Red dwarf with a super-Earth exoplanet and strange signals.' },
        { id: 'trappist', name: 'TRAPPIST-1', distance: 39.5, difficulty: 5, explored: false,
            resources: { minerals: 70, rareElements: 25, alienArtifacts: 0 },
            description: 'Ultra-cool dwarf star with seven temperate terrestrial planets.' },
        { id: 'kepler', name: 'Kepler-442', distance: 1206, difficulty: 6, explored: false,
            resources: { minerals: 100, rareElements: 40, alienArtifacts: 2 },
            description: 'Hosts one of the most Earth-like exoplanets ever discovered.' },
        { id: 'proxima', name: 'Proxima Centauri', distance: 4.2, difficulty: 1, explored: false,
            resources: { minerals: 15, rareElements: 4, alienArtifacts: 0 },
            description: 'Our closest stellar neighbor with an Earth-sized exoplanet.' },
        { id: 'zenith', name: 'Zenith Cluster', distance: 5000, difficulty: 10, explored: false,
            resources: { minerals: 500, rareElements: 200, alienArtifacts: 10 },
            description: 'Mysterious distant star cluster with unusual energy readings.' },
    ]);

    // Colonies
    const [colonies, setColonies] = useState({
        enabled: false,
        list: [],
        baseColonyCost: { minerals: 100, energy: 50 },
        baseBuildingCost: { minerals: 50, energy: 25 },
    });

    // Alien Contact
    const [alienContact, setAlienContact] = useState({
        enabled: false,
        discoveredRaces: [],
        relationshipProgress: {},
        currentDiplomaticMission: null,
    });

    const [alienRaces] = useState([
        {
            id: 'zorgons',
            name: 'Zorgons',
            description: 'Advanced crystalline entities with deep knowledge of quantum physics.',
            discoveryRequirements: { planetarySystemsDiscovered: 3 },
            specialties: ['Energy Technology', 'Quantum Physics'],
            gifts: { technology: 'advancedEnergySystems', bonus: 1 }
        },
        {
            id: 'meridians',
            name: 'Meridians',
            description: 'Highly sociable aquatic species with expertise in ecological systems.',
            discoveryRequirements: { planetarySystemsDiscovered: 4 },
            specialties: ['Ecological Engineering', 'Hydroponic Farming'],
            gifts: { resource: 'colonists', amount: 10 }
        },
        {
            id: 'vexilians',
            name: 'Vexilians',
            description: 'Ancient race of sentient machines with vast databases of galactic knowledge.',
            discoveryRequirements: { planetarySystemsDiscovered: 6 },
            specialties: ['Data Analysis', 'Robotic Engineering'],
            gifts: { resource: 'science', amount: 50 }
        },
        {
            id: 'quilari',
            name: 'Quilari Collective',
            description: 'Hive-mind insectoids with advanced material science and construction techniques.',
            discoveryRequirements: { planetarySystemsDiscovered: 8 },
            specialties: ['Architecture', 'Nanotechnology'],
            gifts: { colonyBonus: 'production', value: 1.5 }
        },
        {
            id: 'eternals',
            name: 'The Eternals',
            description: 'Mysterious energy beings believed to be among the first sentient species in the galaxy.',
            discoveryRequirements: { planetarySystemsDiscovered: 10, alienArtifacts: 5 },
            specialties: ['Cosmic Energies', 'Trans-dimensional Physics'],
            gifts: { technology: 'all', bonus: 0.2 }
        },
    ]);

    // --- Game Logic ---
    // Main game loop
    useEffect(() => {
        const gameLoop = setInterval(() => {
            const now = Date.now();
            const deltaTime = (now - lastTick) / 1000; // Time passed in seconds
            setLastTick(now);

            // Apply game logic on each tick
            tick(deltaTime * speedMultiplier);

            // Random events (low chance per tick)
            if (Math.random() < 0.01 * speedMultiplier) {
                triggerRandomEvent();
            }

        }, 100); // Update every 100ms

        return () => clearInterval(gameLoop);
    }, [lastTick, resources, generators, exploration, colonies, technologies]);

    // Main tick function to update resources
    const tick = (deltaTime) => {
        // Calculate production from generators
        const newResources = { ...resources };

        // Base production from generators
        Object.keys(generators).forEach(genKey => {
            const generator = generators[genKey];
            if (generator.level > 0) {
                let production = generator.level * generator.baseProduction * deltaTime;

                // Apply technology bonuses
                Object.keys(technologies).forEach(techKey => {
                    const tech = technologies[techKey];
                    if (tech.level > 0 && tech.effect === genKey) {
                        production *= Math.pow(tech.effectValue, tech.level);
                    }
                });

                // Apply colony bonuses
                if (colonies.enabled) {
                    colonies.list.forEach(colony => {
                        if (colony.buildings.some(b => b.type === 'production' && b.resource === generator.resource)) {
                            production *= 1.1;
                        }
                    });
                }

                newResources[generator.resource] += production;
            }
        });

        // Additional production from colonies
        if (colonies.enabled) {
            colonies.list.forEach(colony => {
                if (colony.buildings.some(b => b.type === 'mine')) {
                    newResources.minerals += 0.3 * deltaTime * colony.population / 10;
                }
                if (colony.buildings.some(b => b.type === 'lab')) {
                    newResources.science += 0.2 * deltaTime * colony.population / 10;
                }
                if (colony.buildings.some(b => b.type === 'habitat')) {
                    if (Math.random() < 0.01 * deltaTime) {
                        newResources.colonists += 1;
                    }
                }
            });
        }

        // Progress on exploration missions
        if (exploration.enabled && exploration.currentMission) {
            const mission = { ...exploration.currentMission };
            mission.progress += exploration.explorationSpeed * deltaTime;

            if (mission.progress >= mission.duration) {
                // Mission complete!
                const system = planetarySystems.find(sys => sys.id === mission.systemId);

                if (system && !system.explored) {
                    // Mark as explored and collect resources
                    const updatedPlanetarySystems = planetarySystems.map(sys => {
                        if (sys.id === system.id) {
                            return { ...sys, explored: true };
                        }
                        return sys;
                    });

                    // Add resources from the system
                    Object.keys(system.resources).forEach(resource => {
                        newResources[resource] += system.resources[resource];
                    });

                    // Update exploration stats
                    setExploration(prev => ({
                        ...prev,
                        currentMission: null,
                        planetarySystemsDiscovered: prev.planetarySystemsDiscovered + 1
                    }));

                    // Check for alien race discovery
                    checkForAlienRaceDiscovery(exploration.planetarySystemsDiscovered + 1, newResources.alienArtifacts);

                    // Notification
                    addNotification(`Exploration of ${system.name} complete! Resources collected.`);
                }
            } else {
                // Update mission progress
                setExploration(prev => ({
                    ...prev,
                    currentMission: mission
                }));
            }
        }

        // Progress on diplomatic missions
        if (alienContact.enabled && alienContact.currentDiplomaticMission) {
            const mission = { ...alienContact.currentDiplomaticMission };
            mission.progress += deltaTime;

            if (mission.progress >= mission.duration) {
                // Mission complete!
                const race = alienRaces.find(race => race.id === mission.raceId);

                if (race) {
                    // Improve relationship
                    const newRelationships = { ...alienContact.relationshipProgress };
                    newRelationships[race.id] = (newRelationships[race.id] || 0) + 20;

                    // If relationship milestone reached, give reward
                    if (newRelationships[race.id] >= 100 && !mission.giftReceived) {
                        giveAlienGift(race);
                        mission.giftReceived = true;
                    }

                    setAlienContact(prev => ({
                        ...prev,
                        currentDiplomaticMission: null,
                        relationshipProgress: newRelationships
                    }));

                    // Notification
                    addNotification(`Diplomatic mission with ${race.name} complete! Relationship improved.`);
                }
            } else {
                // Update mission progress
                setAlienContact(prev => ({
                    ...prev,
                    currentDiplomaticMission: mission
                }));
            }
        }

        setResources(newResources);
    };

    // Purchase a generator upgrade
    const upgradeGenerator = (genKey) => {
        const generator = generators[genKey];
        const cost = Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, generator.level));

        if (resources.minerals >= cost) {
            // Subtract cost
            setResources(prev => ({
                ...prev,
                minerals: prev.minerals - cost
            }));

            // Upgrade generator
            setGenerators(prev => ({
                ...prev,
                [genKey]: {
                    ...prev[genKey],
                    level: prev[genKey].level + 1
                }
            }));

            // Notification for significant upgrades
            if ((generator.level + 1) % 5 === 0) {
                addNotification(`${getGeneratorName(genKey)} upgraded to level ${generator.level + 1}!`);
            }
        } else {
            console.log("Not enough minerals", resources.minerals, cost);
        }
    };

    // Research a technology
    const researchTechnology = (techKey) => {
        const tech = technologies[techKey];
        const cost = Math.floor(tech.cost * Math.pow(tech.costMultiplier, tech.level));

        if (resources.science >= cost && tech.level < tech.maxLevel && meetsRequirements(tech.requirements)) {
            // Subtract cost
            setResources(prev => ({
                ...prev,
                science: prev.science - cost
            }));

            // Upgrade technology
            setTechnologies(prev => ({
                ...prev,
                [techKey]: {
                    ...prev[techKey],
                    level: prev[techKey].level + 1
                }
            }));

            // Handle special technology effects
            if (tech.effect === 'unlockExploration' && !exploration.enabled) {
                setExploration(prev => ({ ...prev, enabled: true }));
                addNotification('Space Exploration technology unlocked! You can now explore nearby star systems.');
            }
            else if (tech.effect === 'unlockColonization' && !colonies.enabled) {
                setColonies(prev => ({ ...prev, enabled: true }));
                addNotification('Colonization technology unlocked! You can now establish colonies on explored planets.');
            }
            else if (tech.effect === 'unlockAlienContact' && !alienContact.enabled) {
                setAlienContact(prev => ({ ...prev, enabled: true }));
                addNotification('Xeno-Linguistics technology unlocked! You can now communicate with alien civilizations.');
            }
            else {
                addNotification(`${tech.name} researched to level ${tech.level + 1}!`);
            }
        }
    };

    // Check if requirements for a technology are met
    const meetsRequirements = (requirements) => {
        for (const reqTech in requirements) {
            if (technologies[reqTech].level < requirements[reqTech]) {
                return false;
            }
        }
        return true;
    };

    // Start an exploration mission
    const startExplorationMission = (systemId) => {
        if (exploration.currentMission) return;

        const system = planetarySystems.find(sys => sys.id === systemId);
        if (system && !system.explored) {
            const missionDuration = system.distance * (5 / exploration.explorationSpeed);

            setExploration(prev => ({
                ...prev,
                currentMission: {
                    systemId,
                    progress: 0,
                    duration: missionDuration
                }
            }));

            addNotification(`Exploration mission to ${system.name} launched! ETA: ${missionDuration.toFixed(1)} seconds.`);
        }
    };

    // Establish a new colony
    const establishColony = (systemId) => {
        const system = planetarySystems.find(sys => sys.id === systemId);
        if (!system || !system.explored) return;

        const cost = colonies.baseColonyCost;
        if (resources.minerals >= cost.minerals && resources.energy >= cost.energy && resources.colonists >= 5) {
            // Subtract resources
            setResources(prev => ({
                ...prev,
                minerals: prev.minerals - cost.minerals,
                energy: prev.energy - cost.energy,
                colonists: prev.colonists - 5
            }));

            // Create colony
            const newColony = {
                id: `colony-${system.id}`,
                name: `${system.name} Colony`,
                systemId: system.id,
                population: 5,
                maxPopulation: 10,
                buildings: []
            };

            setColonies(prev => ({
                ...prev,
                list: [...prev.list, newColony]
            }));

            addNotification(`New colony established in ${system.name}!`);
        }
    };

    // Build a structure in a colony
    const buildColonyStructure = (colonyId, buildingType) => {
        const colony = colonies.list.find(c => c.id === colonyId);
        if (!colony) return;

        const cost = colonies.baseBuildingCost;
        if (resources.minerals >= cost.minerals && resources.energy >= cost.energy) {
            // Subtract resources
            setResources(prev => ({
                ...prev,
                minerals: prev.minerals - cost.minerals,
                energy: prev.energy - cost.energy
            }));

            // Add building
            let buildingDetails = {
                type: buildingType,
                id: `${buildingType}-${Date.now()}`
            };

            // Add specific properties based on building type
            if (buildingType === 'production') {
                buildingDetails.resource = 'minerals';
            }

            setColonies(prev => ({
                ...prev,
                list: prev.list.map(c => {
                    if (c.id === colonyId) {
                        // Update colony properties based on building
                        const updatedColony = { ...c };

                        if (buildingType === 'habitat') {
                            updatedColony.maxPopulation += 5;
                        }

                        return {
                            ...updatedColony,
                            buildings: [...updatedColony.buildings, buildingDetails]
                        };
                    }
                    return c;
                })
            }));

            addNotification(`${getBuildingName(buildingType)} built in ${colony.name}!`);
        }
    };

    // Start a diplomatic mission
    const startDiplomaticMission = (raceId) => {
        if (alienContact.currentDiplomaticMission) return;

        const race = alienRaces.find(r => r.id === raceId);
        if (race && alienContact.discoveredRaces.includes(raceId)) {
            // Resource cost based on current relationship level
            const currentRelationship = alienContact.relationshipProgress[raceId] || 0;
            const cost = 10 + Math.floor(currentRelationship / 10) * 5;

            if (resources.science >= cost) {
                // Subtract resources
                setResources(prev => ({
                    ...prev,
                    science: prev.science - cost
                }));

                // Start mission
                setAlienContact(prev => ({
                    ...prev,
                    currentDiplomaticMission: {
                        raceId,
                        progress: 0,
                        duration: 10,
                        giftReceived: false
                    }
                }));

                addNotification(`Diplomatic mission to the ${race.name} initiated.`);
            }
        }
    };

    // Check if any alien races should be discovered
    const checkForAlienRaceDiscovery = (exploredSystems, artifacts) => {
        alienRaces.forEach(race => {
            const req = race.discoveryRequirements;
            const alreadyDiscovered = alienContact.discoveredRaces.includes(race.id);

            if (!alreadyDiscovered && req.planetarySystemsDiscovered <= exploredSystems &&
                (!req.alienArtifacts || req.alienArtifacts <= artifacts)) {
                // Discover new race
                setAlienContact(prev => ({
                    ...prev,
                    discoveredRaces: [...prev.discoveredRaces, race.id],
                    relationshipProgress: {
                        ...prev.relationshipProgress,
                        [race.id]: 10 // Initial relationship value
                    }
                }));

                addNotification(`First contact established with the ${race.name}! They appear to be ${race.description}`);
            }
        });
    };

    // Give gifts from alien races when relationship milestones are reached
    const giveAlienGift = (race) => {
        const gift = race.gifts;

        if (gift.technology) {
            if (gift.technology === 'all') {
                // Special case: boost all technologies
                setTechnologies(prev => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach(techKey => {
                        const tech = updated[techKey];
                        if (tech.level > 0 && tech.level < tech.maxLevel) {
                            updated[techKey] = {
                                ...tech,
                                effectValue: tech.effectValue * (1 + gift.bonus)
                            };
                        }
                    });
                    return updated;
                });
                addNotification(`The ${race.name} have shared technological insights that boost all your technologies!`);
            } else if (technologies[gift.technology] && technologies[gift.technology].level < technologies[gift.technology].maxLevel) {
                // Boost specific technology
                researchTechnology(gift.technology);
                addNotification(`The ${race.name} have granted you advanced knowledge in ${technologies[gift.technology].name}!`);
            }
        }
        else if (gift.resource && gift.amount) {
            // Resource gift
            setResources(prev => ({
                ...prev,
                [gift.resource]: prev[gift.resource] + gift.amount
            }));
            addNotification(`The ${race.name} have gifted you ${gift.amount} ${gift.resource}!`);
        }
        else if (gift.colonyBonus) {
            // Apply bonus to colonies
            if (gift.colonyBonus === 'production') {
                // TODO: Implement colony production bonuses
                addNotification(`The ${race.name} have shared construction techniques to boost your colony production!`);
            }
        }
    };

    // Trigger random events
    const triggerRandomEvent = () => {
        const events = [
            {
                name: 'Solar Flare',
                condition: () => generators.solarPanel.level >= 3,
                effect: () => {
                    const bonus = Math.floor(generators.solarPanel.level * 2);
                    setResources(prev => ({
                        ...prev,
                        energy: prev.energy + bonus
                    }));
                    return `A solar flare has boosted your solar panels, generating ${bonus} extra energy!`;
                }
            },
            {
                name: 'Mineral Deposit',
                condition: () => generators.miningRig.level >= 3,
                effect: () => {
                    const bonus = Math.floor(generators.miningRig.level * 2);
                    setResources(prev => ({
                        ...prev,
                        minerals: prev.minerals + bonus
                    }));
                    return `Your mining sensors detected a rich mineral deposit, yielding ${bonus} minerals!`;
                }
            },
            {
                name: 'Scientific Breakthrough',
                condition: () => generators.researchLab.level >= 2,
                effect: () => {
                    const bonus = Math.floor(generators.researchLab.level * 1.5);
                    setResources(prev => ({
                        ...prev,
                        science: prev.science + bonus
                    }));
                    return `A scientific breakthrough in your labs has generated ${bonus} science points!`;
                }
            },
            {
                name: 'Equipment Malfunction',
                condition: () => exploration.planetarySystemsDiscovered >= 2,
                effect: () => {
                    // Slow down current exploration mission
                    if (exploration.currentMission) {
                        setExploration(prev => ({
                            ...prev,
                            explorationSpeed: prev.explorationSpeed * 0.8
                        }));
                        setTimeout(() => {
                            setExploration(prev => ({
                                ...prev,
                                explorationSpeed: prev.explorationSpeed / 0.8
                            }));
                        }, 5000);
                        return 'Your exploration ship reports equipment malfunctions. Exploration speed reduced temporarily.';
                    }
                    return 'Minor equipment malfunctions reported in your facility. No significant impact.';
                }
            },
            {
                name: 'Colonist Volunteers',
                condition: () => colonies.enabled && colonies.list.length > 0,
                effect: () => {
                    const bonus = Math.floor(Math.random() * 3) + 1;
                    setResources(prev => ({
                        ...prev,
                        colonists: prev.colonists + bonus
                    }));
                    return `${bonus} new volunteers have signed up for your colonization program!`;
                }
            }
        ];

        // Filter events that match their conditions
        const validEvents = events.filter(e => e.condition());

        if (validEvents.length > 0) {
            // Select random event from valid options
            const selectedEvent = validEvents[Math.floor(Math.random() * validEvents.length)];
            const message = selectedEvent.effect();
            addNotification(message);
        }
    };

    // Add a notification
    const addNotification = (message) => {
        const newNotification = {
            id: Date.now(),
            message
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 5)); // Keep only last 5 notifications
    };

    // Helper functions
    const getGeneratorName = (genKey) => {
        const names = {
            solarPanel: 'Solar Panel',
            miningRig: 'Mining Rig',
            scanner: 'Resource Scanner',
            researchLab: 'Research Lab'
        };
        return names[genKey] || genKey;
    };

    const getGeneratorDescription = (genKey) => {
        const descriptions = {
            solarPanel: 'Generate energy from solar radiation',
            miningRig: 'Extract minerals from nearby asteroids',
            scanner: 'Detect and refine rare elements',
            researchLab: 'Conduct scientific research and generate science points'
        };
        return descriptions[genKey] || '';
    };

    const getBuildingName = (buildingType) => {
        const names = {
            habitat: 'Habitat Dome',
            mine: 'Mining Facility',
            lab: 'Research Outpost',
            production: 'Production Plant'
        };
        return names[buildingType] || buildingType;
    };

    const getBuildingDescription = (buildingType) => {
        const descriptions = {
            habitat: 'Increases colony population capacity',
            mine: 'Generates additional minerals based on population',
            lab: 'Produces science points based on population',
            production: 'Boosts resource production from your main facilities'
        };
        return descriptions[buildingType] || '';
    };

    const formatNumber = (num) => {
        return Math.floor(num).toLocaleString();
    };

    // --- UI Components ---
    // Resource Bar
    const ResourceBar = () => (
        <div className={styles.resourceBar}>
            {Object.keys(resources).map(resource => (
                <div key={resource} className={styles.resourceItem}>
                    <ResourceIcon resource={resource} />
                    <span>{resource.charAt(0).toUpperCase() + resource.slice(1)}: {formatNumber(resources[resource])}</span>
                </div>
            ))}
        </div>
    );

    // Resource icon helper
    const ResourceIcon = ({ resource }) => {
        const icons = {
            energy: <Zap size={16} className="text-yellow-400" />,
            minerals: <Building size={16} className="text-gray-400" />,
            rareElements: <Award size={16} className="text-purple-400" />,
            science: <Beaker size={16} className="text-blue-400" />,
            cosmicData: <Globe size={16} className="text-green-400" />,
            alienArtifacts: <Globe size={16} className="text-red-400" />,
            colonists: <Globe size={16} className="text-orange-400" />
        };
        return icons[resource] || null;
    };

    // Resource Extraction Tab Content
    const ResourcesTab = () => (
        <div className={styles.content}>
            <h2 className="text-xl font-bold mb-4">Resource Extraction & Production</h2>

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="mb-4">
                    {notifications.map(notification => (
                        <div key={notification.id} className={styles.eventNotification}>
                            <div className="flex items-center">
                                <AlertTriangle size={18} className="text-yellow-500 mr-2" />
                                <span>{notification.message}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.cardGrid}>
                {Object.keys(generators).map(genKey => {
                    const generator = generators[genKey];
                    const cost = Math.floor(generator.baseCost * Math.pow(generator.costMultiplier, generator.level));

                    // Calculate production with tech bonuses
                    let productionRate = generator.level * generator.baseProduction;
                    Object.keys(technologies).forEach(techKey => {
                        const tech = technologies[techKey];
                        if (tech.level > 0 && tech.effect === genKey) {
                            productionRate *= Math.pow(tech.effectValue, tech.level);
                        }
                    });

                    return (
                        <div key={genKey} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.cardTitle}>
                                    <ResourceIcon resource={generator.resource} />
                                    <span className="ml-2">{getGeneratorName(genKey)} (Lvl {generator.level})</span>
                                </div>
                                <button
                                    className={resources.minerals >= cost ? styles.upgradeBtn : `${styles.upgradeBtn} opacity-50 cursor-not-allowed`}
                                    onClick={() => {
                                        if (resources.minerals >= cost) {
                                            upgradeGenerator(genKey);
                                        }
                                    }}
                                >
                                    <Plus size={16} className="mr-1" />
                                    {cost}
                                </button>
                            </div>
                            <div className={styles.cardBody}>
                                <p className="text-sm text-gray-400 mb-2">{getGeneratorDescription(genKey)}</p>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Production:</span>
                                    <span>{productionRate.toFixed(1)} {generator.resource}/s</span>
                                </div>
                                {generator.level > 0 && (
                                    <div className="mt-2">
                                        <div className="flex justify-between text-xs text-gray-400">
                                            <span>Next upgrade cost:</span>
                                            <span>{cost} minerals</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Research Tab Content
    const ResearchTab = () => (
        <div className={styles.content}>
            <h2 className="text-xl font-bold mb-4">Scientific Research</h2>

            <div className={styles.techTree}>
                {Object.keys(technologies).map(techKey => {
                    const tech = technologies[techKey];
                    const cost = Math.floor(tech.cost * Math.pow(tech.costMultiplier, tech.level));
                    const canResearch = meetsRequirements(tech.requirements) && tech.level < tech.maxLevel;
                    const isMaxed = tech.level >= tech.maxLevel;

                    return (
                        <div key={techKey} className={styles.techItem}>
                            <div className="flex justify-between">
                                <div>
                                    <h3 className="font-bold">{tech.name} {tech.level > 0 ? `(Level ${tech.level}/${tech.maxLevel})` : ''}</h3>
                                    <p className="text-sm text-gray-400">{tech.description}</p>

                                    {/* Requirements */}
                                    {Object.keys(tech.requirements).length > 0 && (
                                        <div className={styles.requirementText}>
                                            Requires: {Object.keys(tech.requirements).map(req => (
                                            `${technologies[req].name} (${technologies[req].level}/${tech.requirements[req]})`
                                        )).join(', ')}
                                        </div>
                                    )}
                                </div>

                                <button
                                    className={
                                        isMaxed ? `${styles.btn} ${styles.disabledBtn}` :
                                            canResearch && resources.science >= cost ? `${styles.btn} ${styles.primaryBtn}` :
                                                `${styles.btn} ${styles.disabledBtn}`
                                    }
                                    onClick={() => researchTechnology(techKey)}
                                    disabled={!canResearch || resources.science < cost || isMaxed}
                                >
                                    {isMaxed ? 'Completed' : `Research (${cost})`}
                                </button>
                            </div>

                            {tech.level > 0 && (
                                <div className="mt-2">
                                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                                        <span>Current effect:</span>
                                        <span>
                      {tech.effect.startsWith('unlock') ?
                          'Unlocks new capabilities' :
                          `${tech.effectValue.toFixed(1)}x bonus to ${tech.effect}`}
                    </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );

    // Exploration Tab Content
    const ExplorationTab = () => {
        if (!exploration.enabled) {
            return (
                <div className={styles.content}>
                    <div className="text-center py-8">
                        <h2 className="text-xl font-bold mb-2">Space Exploration Locked</h2>
                        <p className="mb-4">Research 'Space Exploration' technology to unlock this capability.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.content}>
                <h2 className="text-xl font-bold mb-4">Space Exploration</h2>

                {/* Current mission status */}
                {exploration.currentMission && (
                    <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <h3 className="font-bold mb-2">Current Mission</h3>
                        <div className="flex justify-between mb-2">
                            <span>Destination:</span>
                            <span>{planetarySystems.find(sys => sys.id === exploration.currentMission.systemId)?.name}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Progress:</span>
                            <span>{Math.min(100, (exploration.currentMission.progress / exploration.currentMission.duration * 100)).toFixed(1)}%</span>
                        </div>
                        <div className={styles.progressContainer}>
                            <div
                                className={styles.progressBar}
                                style={{ width: `${Math.min(100, (exploration.currentMission.progress / exploration.currentMission.duration * 100))}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                <h3 className="font-bold mb-2">Star Systems ({exploration.planetarySystemsDiscovered}/{exploration.maxPlanetarySystems} discovered)</h3>

                <div className={styles.planetGrid}>
                    {planetarySystems.map(system => (
                        <div key={system.id} className={`${styles.planetCard} ${system.explored ? 'border-green-600' : ''}`}>
                            <h4 className="font-bold mb-1">{system.name}</h4>
                            <div className="text-xs text-gray-400 mb-2">Distance: {system.distance} light years</div>
                            <div className="text-xs text-gray-400 mb-2">Difficulty: {Array(system.difficulty).fill('★').join('')}</div>

                            {system.explored ? (
                                <div>
                                    <div className="text-xs bg-green-900 inline-block px-2 py-1 rounded mb-2">Explored</div>
                                    {colonies.enabled && !colonies.list.some(c => c.systemId === system.id) && (
                                        <button
                                            className={`${styles.btn} ${styles.primaryBtn} text-xs w-full mt-2`}
                                            onClick={() => establishColony(system.id)}
                                        >
                                            Establish Colony
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <button
                                    className={`${styles.btn} ${exploration.currentMission ? styles.disabledBtn : styles.primaryBtn} text-xs w-full mt-2`}
                                    onClick={() => startExplorationMission(system.id)}
                                    disabled={exploration.currentMission !== null}
                                >
                                    Explore
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Colonies Tab Content
    const ColoniesTab = () => {
        if (!colonies.enabled) {
            return (
                <div className={styles.content}>
                    <div className="text-center py-8">
                        <h2 className="text-xl font-bold mb-2">Colonization Locked</h2>
                        <p className="mb-4">Research 'Colonization Technology' to unlock this capability.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.content}>
                <h2 className="text-xl font-bold mb-4">Space Colonies</h2>

                {colonies.list.length === 0 ? (
                    <div className="text-center py-4">
                        <p>No colonies established yet. Explore star systems and establish colonies on suitable planets.</p>
                    </div>
                ) : (
                    <div className={styles.colonyGrid}>
                        {colonies.list.map(colony => {
                            const system = planetarySystems.find(sys => sys.id === colony.systemId);

                            return (
                                <div key={colony.id} className={styles.card}>
                                    <div className={styles.cardHeader}>
                                        <div className={styles.cardTitle}>
                                            <span>{colony.name}</span>
                                        </div>
                                    </div>
                                    <div className={styles.cardBody}>
                                        <div className="flex justify-between mb-2">
                                            <span>Population:</span>
                                            <span>{colony.population}/{colony.maxPopulation}</span>
                                        </div>

                                        <div className={styles.progressContainer}>
                                            <div
                                                className={styles.progressBar}
                                                style={{ width: `${(colony.population / colony.maxPopulation * 100)}%` }}
                                            ></div>
                                        </div>

                                        <h4 className="font-bold mt-4 mb-2">Buildings ({colony.buildings.length})</h4>
                                        {colony.buildings.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2 mb-4">
                                                {colony.buildings.map(building => (
                                                    <div key={building.id} className="bg-gray-700 p-2 rounded text-xs">
                                                        {getBuildingName(building.type)}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 mb-4">No buildings constructed yet.</p>
                                        )}

                                        <h4 className="font-bold mb-2">Construct Building</h4>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['habitat', 'mine', 'lab', 'production'].map(buildingType => (
                                                <button
                                                    key={buildingType}
                                                    className={`${styles.btn} ${styles.primaryBtn} text-xs`}
                                                    onClick={() => buildColonyStructure(colony.id, buildingType)}
                                                >
                                                    {getBuildingName(buildingType)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Alien Contact Tab Content
    const AlienContactTab = () => {
        if (!alienContact.enabled) {
            return (
                <div className={styles.content}>
                    <div className="text-center py-8">
                        <h2 className="text-xl font-bold mb-2">Alien Contact Locked</h2>
                        <p className="mb-4">Research 'Xeno-Linguistics' technology to unlock this capability.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.content}>
                <h2 className="text-xl font-bold mb-4">Alien Civilizations</h2>

                {/* Current diplomatic mission */}
                {alienContact.currentDiplomaticMission && (
                    <div className="mb-6 bg-gray-800 rounded-lg p-4 border border-gray-700">
                        <h3 className="font-bold mb-2">Current Diplomatic Mission</h3>
                        <div className="flex justify-between mb-2">
                            <span>Species:</span>
                            <span>{alienRaces.find(race => race.id === alienContact.currentDiplomaticMission.raceId)?.name}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span>Progress:</span>
                            <span>{Math.min(100, (alienContact.currentDiplomaticMission.progress / alienContact.currentDiplomaticMission.duration * 100)).toFixed(1)}%</span>
                        </div>
                        <div className={styles.progressContainer}>
                            <div
                                className={styles.progressBar}
                                style={{ width: `${Math.min(100, (alienContact.currentDiplomaticMission.progress / alienContact.currentDiplomaticMission.duration * 100))}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {alienContact.discoveredRaces.length === 0 ? (
                    <div className="text-center py-4">
                        <p>No alien civilizations discovered yet. Continue exploring the galaxy to encounter new species.</p>
                    </div>
                ) : (
                    <div>
                        <h3 className="font-bold mb-2">Known Species</h3>
                        {alienContact.discoveredRaces.map(raceId => {
                            const race = alienRaces.find(r => r.id === raceId);
                            const relationship = alienContact.relationshipProgress[raceId] || 0;

                            return (
                                <div key={raceId} className={styles.alienRace}>
                                    <div className="flex-1">
                                        <h4 className="font-bold">{race.name}</h4>
                                        <p className="text-sm text-gray-400 mb-2">{race.description}</p>

                                        <div className="text-xs text-gray-400 mb-1">Specialties: {race.specialties.join(', ')}</div>

                                        <div className="flex justify-between text-sm mb-1">
                                            <span>Relationship:</span>
                                            <span>{relationship}/100</span>
                                        </div>

                                        <div className={styles.progressContainer}>
                                            <div
                                                className={styles.progressBar}
                                                style={{ width: `${relationship}%`, backgroundColor: relationship >= 100 ? '#10B981' : '#3B82F6' }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="ml-4">
                                        <button
                                            className={`${styles.btn} ${alienContact.currentDiplomaticMission ? styles.disabledBtn : styles.primaryBtn} text-xs`}
                                            onClick={() => startDiplomaticMission(raceId)}
                                            disabled={alienContact.currentDiplomaticMission !== null}
                                        >
                                            Diplomatic Mission
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    // Main Game Interface
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Cosmic Pioneers</h1>
                <div className="flex items-center gap-2">
                    <button
                        className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs"
                        onClick={() => setSpeedMultiplier(prev => prev === 1 ? 5 : 1)}
                    >
                        {speedMultiplier > 1 ? 'Normal Speed' : 'Fast Forward'}
                    </button>
                </div>
            </div>

            <ResourceBar />

            <div className={styles.tabsContainer}>
                <div
                    className={activeTab === 'resources' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('resources')}
                >
                    <div className="flex items-center">
                        <Zap size={16} className="mr-1" />
                        Resources
                    </div>
                </div>
                <div
                    className={activeTab === 'research' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('research')}
                >
                    <div className="flex items-center">
                        <Beaker size={16} className="mr-1" />
                        Research
                    </div>
                </div>
                <div
                    className={activeTab === 'exploration' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('exploration')}
                >
                    <div className="flex items-center">
                        <Rocket size={16} className="mr-1" />
                        Exploration
                    </div>
                </div>
                <div
                    className={activeTab === 'colonies' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('colonies')}
                >
                    <div className="flex items-center">
                        <Building size={16} className="mr-1" />
                        Colonies
                    </div>
                </div>
                <div
                    className={activeTab === 'aliens' ? styles.activeTab : styles.tab}
                    onClick={() => setActiveTab('aliens')}
                >
                    <div className="flex items-center">
                        <Globe size={16} className="mr-1" />
                        Aliens
                    </div>
                </div>
            </div>

            <div className="overflow-y-auto flex-1">
                {activeTab === 'resources' && <ResourcesTab />}
                {activeTab === 'research' && <ResearchTab />}
                {activeTab === 'exploration' && <ExplorationTab />}
                {activeTab === 'colonies' && <ColoniesTab />}
                {activeTab === 'aliens' && <AlienContactTab />}
            </div>
        </div>
    );
};

export default GameApp;