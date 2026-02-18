import React, { useState, useEffect } from "react";

// === DATA & CONSTANTS ===

const TECHNOLOGIES = [
  // Basic tree, each unlocks something
  { id: "basic_mining", name: "Extraction Basique", cost: 30, desc: "Débloque la mine sur astéroïdes.", unlocks: ["mine"] },
  { id: "faster_ships", name: "Vaisseaux plus rapides", cost: 50, desc: "Réduit le temps des missions d'exploration.", unlocks: ["fleet_speed"] },
  { id: "advanced_exploration", name: "Exploration avancée", cost: 80, desc: "Découvre de nouveaux systèmes.", unlocks: ["systems"] },
  { id: "colony_pods", name: "Modules de colonie", cost: 120, desc: "Permet de fonder des colonies.", unlocks: ["colonization"] },
  { id: "scientific_ai", name: "IA scientifique", cost: 200, desc: "Boost la recherche.", unlocks: ["science_boost"] },
];

const INIT_RESOURCES = {
  metal: 0,
  energy: 0,
  science: 20, // pour démarrer direct la techno
  population: 5,
  food: 10,
};

const MISSIONS = [
  { id: "asteroid_mining", name: "Mine d'astéroïde", time: 60, reward: { metal: 10 } },
  { id: "deep_space_probe", name: "Sonde lointaine", time: 120, reward: { science: 15, energy: 5 } },
];

const SYSTEMS = [
  { id: "sol", name: "Système Solaire", unlockCost: 0, richness: 1 },
  { id: "alpha_centauri", name: "Alpha du Centaure", unlockCost: 50, richness: 2 },
  { id: "vega", name: "Véga", unlockCost: 120, richness: 3 }
];

const UPGRADES = [
  { id: "better_drills", name: "Foreuses améliorées", cost: 30, desc: "+50% rendement mines", type: "mining" },
  { id: "fusion_power", name: "Réacteur à fusion", cost: 50, desc: "+50% énergie", type: "energy" }
];

// === HELPERS ===

function addResources(resources, delta) {
  let result = { ...resources };
  for (const k in delta) {
    if (typeof delta[k] === "number") result[k] = (result[k] || 0) + delta[k];
  }
  return result;
}

function canAfford(resources, cost) {
  for (const k in cost) {
    if ((resources[k] || 0) < cost[k]) return false;
  }
  return true;
}

function payResources(resources, cost) {
  let newRes = { ...resources };
  for (const k in cost) {
    newRes[k] -= cost[k];
  }
  return newRes;
}

// === MAIN APP ===

export default function App() {
  // State
  const [resources, setResources] = useState(INIT_RESOURCES);
  const [techs, setTechs] = useState(["starter"]);
  const [scienceProgress, setScienceProgress] = useState(0); // auto-recherche
  const [currentResearch, setCurrentResearch] = useState(null);

  // Industrie
  const [mines, setMines] = useState(0);
  const [energyPlants, setEnergyPlants] = useState(0);

  // Flotte
  const [ships, setShips] = useState(1);
  const [missions, setMissions] = useState([]);
  const [fleetSpeed, setFleetSpeed] = useState(1); // bonus

  // Exploration
  const [discovered, setDiscovered] = useState(["sol"]);
  const [currentSystem, setCurrentSystem] = useState("sol");

  // Colonies & Population
  const [colonies, setColonies] = useState([]);
  const [population, setPopulation] = useState(INIT_RESOURCES.population);
  const [food, setFood] = useState(INIT_RESOURCES.food);

  // Industry upgrades
  const [miningBonus, setMiningBonus] = useState(1);
  const [energyBonus, setEnergyBonus] = useState(1);

  // === CORE LOOP: TICK (Idle Production etc) ===
  useEffect(() => {
    const interval = setInterval(() => {
      // Mines (si techno extra boni)
      if (techs.includes("basic_mining")) {
        const mined = mines * 1 * miningBonus;
        setResources(r => addResources(r, { metal: mined }));
      }
      // Centrales
      if (energyPlants > 0) {
        setResources(r => addResources(r, { energy: energyPlants * 1 * energyBonus }));
      }
      // Science auto (si IA boost)
      let sciMult = techs.includes("science_boost") ? 1.5 : 1;
      setResources(r => addResources(r, { science: 0.2 * sciMult }));

      // Colonies produisent population et nourriture
      let popGain = colonies.length > 0 ? colonies.length * 0.02 : 0;
      setPopulation(p => p + popGain);
      let foodGain = colonies.length > 0 ? colonies.length * 0.1 : 0;
      setFood(f => f + foodGain);

      // Auto progression recherche
      if (currentResearch) {
        setScienceProgress(x => x + (0.5 * sciMult));
      }

      // Consommation nourriture/pop
      setFood(f => f - population * 0.005);

      // Missions actives : décrémenter les timers
      setMissions(mis =>
          mis.map(m => ({ ...m, progress: m.progress + 1 * fleetSpeed }))
      );

    }, 1000);
    return () => clearInterval(interval);
  }, [mines, miningBonus, energyPlants, energyBonus, colonies.length, techs, currentResearch, fleetSpeed, population]);

  // === Gestion Missions (fin d'une mission) ===
  useEffect(() => {
    setMissions(mis =>
        mis.filter(m => {
          if (m.progress >= m.time) {
            setResources(r => addResources(r, m.reward));
            return false; // mission terminée
          }
          return true;
        })
    );
  }, [missions]);

  // === Gestion Recherche (débloquer techno) ===
  useEffect(() => {
    if (currentResearch) {
      const tech = TECHNOLOGIES.find(t => t.id === currentResearch);
      if (scienceProgress >= tech.cost) {
        // Unlock!
        setTechs(t => [...t, tech.id]);
        setCurrentResearch(null);
        setScienceProgress(0);
      }
    }
  }, [scienceProgress, currentResearch]);

  // === Gestion Population / famine ===
  useEffect(() => {
    if (food < 0) {
      setPopulation(p => Math.max(0, p - 0.3));
      setFood(0);
    }
  }, [food]);

  // === Handlers ===

  // Recherche
  function startResearch(techId) {
    setCurrentResearch(techId);
    setScienceProgress(0);
  }

  // Industrie
  function buildMine() {
    if (resources.metal >= 10 && techs.includes("basic_mining")) {
      setResources(payResources(resources, { metal: 10 }));
      setMines(m => m + 1);
    }
  }
  function buildPlant() {
    if (resources.metal >= 12 && techs.includes("basic_mining")) {
      setResources(payResources(resources, { metal: 12 }));
      setEnergyPlants(e => e + 1);
    }
  }
  function buyUpgrade(upg) {
    if (resources.metal >= upg.cost) {
      setResources(payResources(resources, { metal: upg.cost }));
      if (upg.type === "mining") setMiningBonus(b => b * 1.5);
      if (upg.type === "energy") setEnergyBonus(e => e * 1.5);
    }
  }
  // Flotte
  function buildShip() {
    if (resources.metal >= 15 && resources.energy >= 10) {
      setResources(payResources(resources, { metal: 15, energy: 10 }));
      setShips(n => n + 1);
    }
  }
  function sendMission(mission) {
    if (ships >= 1 && (!missions.find(m => m.id === mission.id))) {
      setShips(s => s - 1);
      setMissions(ms => [...ms, { ...mission, progress: 0 }]);
      setTimeout(() => setShips(s => s + 1), mission.time * 1000 / fleetSpeed); // retour auto du vaisseau
    }
  }
  // Exploration
  function discoverSystem(system) {
    if (resources.science >= system.unlockCost && !discovered.includes(system.id)) {
      setResources(payResources(resources, { science: system.unlockCost }));
      setDiscovered(arr => [...arr, system.id]);
    }
  }
  function selectSystem(sid) {
    setCurrentSystem(sid);
  }
  // Colonies
  function foundColony(system) {
    if (
        discovered.includes(system.id) &&
        techs.includes("colony_pods") &&
        resources.metal >= 30 &&
        !colonies.find(c => c.id === system.id)
    ) {
      setResources(payResources(resources, { metal: 30 }));
      setColonies(cs => [...cs, { id: system.id, name: system.name }]);
    }
  }

  // === RENDER ===

  return (
      <div style={{ fontFamily: 'sans-serif', margin: 24, background: "#0c1148", color: "#d3ecff", minHeight: "100vh" }}>
        <h1>🪐 Idle Space Proto</h1>
        <hr />

        {/* RESSOURCES */}
        <section style={{ marginBottom: 24 }}>
          <h2>Ressources</h2>
          <ul>
            <li>🔩 Métal : {resources.metal.toFixed(1)}</li>
            <li>⚡ Énergie : {resources.energy.toFixed(1)}</li>
            <li>🔬 Science : {resources.science.toFixed(1)}</li>
            <li>🍔 Nourriture : {food.toFixed(1)}</li>
            <li>👩 Population : {population.toFixed(1)}</li>
          </ul>
        </section>

        {/* MODULE 1 : LABO */}
        <section style={{ background: "#23297a", padding: 12, marginBottom: 24 }}>
          <h2>🧪 Recherche & Technologies</h2>
          {!currentResearch && (
              <ul>
                {TECHNOLOGIES.filter(t => !techs.includes(t.id)).map(tech =>
                    <li key={tech.id}>
                      <b>{tech.name}</b> (Coût : {tech.cost} Science)
                      <button onClick={() => startResearch(tech.id)} disabled={resources.science < tech.cost}>Lancer Recherche</button>
                      <div style={{ fontSize: 13 }}>{tech.desc}</div>
                    </li>
                )}
              </ul>
          )}
          {currentResearch && (
              <div>
                Recherche en cours : <b>{TECHNOLOGIES.find(t => t.id === currentResearch).name}</b>
                <br />
                {scienceProgress.toFixed(1)} / {TECHNOLOGIES.find(t => t.id === currentResearch).cost}
                <progress value={scienceProgress} max={TECHNOLOGIES.find(t => t.id === currentResearch).cost} style={{ width: 200 }} />
              </div>
          )}
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <strong>Technologies débloquées :</strong> {techs.filter(t => t !== "starter").map(t => TECHNOLOGIES.find(tt => tt.id === t)?.name).join(", ")}
          </div>
        </section>

        {/* MODULE 2 : FLOTTE */}
        <section style={{ background: "#1c1f42", padding: 12, marginBottom: 24 }}>
          <h2>🚀 Flotte et Missions</h2>
          <div>
            <span>Vaisseaux disponibles : {ships}</span>
            <button onClick={buildShip} disabled={resources.metal < 15 || resources.energy < 10}>Construire un vaisseau (15 Métal, 10 Énergie)</button>
          </div>
          <div style={{ marginTop: 10 }}>
            <b>Missions disponibles :</b>
            <ul>
              {MISSIONS.map(mis =>
                  <li key={mis.id}>
                    {mis.name} (Durée : {mis.time / fleetSpeed}s)
                    <button onClick={() => sendMission(mis)} disabled={ships < 1 || missions.find(m => m.id === mis.id)}>Envoyer</button>
                  </li>
              )}
            </ul>
          </div>
          <div>
            <b>Missions en cours :</b>
            <ul>
              {missions.map(m =>
                  <li key={m.id}>{m.name} - {Math.min(m.time, m.progress).toFixed(0)}/{m.time}s
                    {m.progress >= m.time && <span style={{ color: "orange" }}> (Terminé ! Ressources livrées)</span>}
                  </li>
              )}
            </ul>
          </div>
        </section>

        {/* MODULE 3: EXPLORATION */}
        <section style={{ background: "#181b38", padding: 12, marginBottom: 24 }}>
          <h2>🛰️ Exploration et Systèmes stellaires</h2>
          <div>
            <b>Systèmes connus :</b>
            {SYSTEMS.filter(s => discovered.includes(s.id)).map(s => (
                <span key={s.id} style={{ marginLeft: 6 }}>
              <button onClick={() => selectSystem(s.id)} style={{ background: s.id === currentSystem ? "#88aaff" : "" }}>
                {s.name}
              </button>
            </span>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <b>Découvrir un nouveau système :</b>
            <ul>
              {SYSTEMS.filter(s => !discovered.includes(s.id)).map(s =>
                  <li key={s.id}>{s.name} (Coût : {s.unlockCost} Science)
                    <button onClick={() => discoverSystem(s)} disabled={resources.science < s.unlockCost || discovered.includes(s.id)}>Exploration</button>
                  </li>
              )}
            </ul>
          </div>
        </section>

        {/* MODULE 4 : INDUSTRIE */}
        <section style={{ background: "#141847", padding: 12, marginBottom: 24 }}>
          <h2>🏭 Extraction & Industrie Orbitale</h2>
          {techs.includes("basic_mining") ? (
              <>
                <div>
                  <span>Mines : {mines} </span>
                  <button onClick={buildMine} disabled={resources.metal < 10}>Construire une mine (10 Métal)</button>
                </div>
                <div>
                  Centrales énergétiques : {energyPlants}
                  <button onClick={buildPlant} disabled={resources.metal < 12}>Construire centrale (12 Métal)</button>
                </div>
                <div style={{ marginTop: 10 }}>
                  <b>Améliorations :</b>
                  <ul>
                    {UPGRADES.map(upg =>
                        <li key={upg.id}>
                          {upg.name} : {upg.desc} (Coût: {upg.cost} Métal)
                          <button onClick={() => buyUpgrade(upg)} disabled={resources.metal < upg.cost}>Acheter</button>
                        </li>
                    )}
                  </ul>
                </div>
              </>
          ) : (
              <div>Débloque l'extraction grâce à la techno "Extraction Basique" !</div>
          )}
        </section>

        {/* MODULE 5 : COLONIES & POP */}
        <section style={{ background: "#24275a", padding: 12 }}>
          <h2>🏙️ Colonisation & Population</h2>
          {techs.includes("colony_pods") ? (
              <>
                <div>
                  <b>Colonies actuelles :</b>
                  <ul>
                    {colonies.map(col => <li key={col.id}>{col.name}</li>)}
                  </ul>
                  <b>Fonder une nouvelle colonie :</b>
                  <ul>
                    {SYSTEMS.filter(s => discovered.includes(s.id) && !colonies.find(col => col.id === s.id)).map(s =>
                        <li key={s.id}>
                          {s.name} <button onClick={() => foundColony(s)} disabled={resources.metal < 30}>Coloniser (30 Métal)</button>
                        </li>
                    )}
                  </ul>
                </div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  <b>Croissance : </b>La population et la nourriture augmentent un peu chaque seconde selon vos colonies, mais la population consomme aussi de la nourriture !
                </div>
                {food < 3 && <div style={{ color: "tomato" }}>⚠️ La famine menace votre population !</div>}
              </>
          ) : (
              <div>Débloquez la techno "Modules de colonie" pour coloniser !</div>
          )}
        </section>

        <footer style={{ fontSize: 11, textAlign: "center", color: "#668" }}>
          <hr />
          Idle Space Prototype - par GPT, 2024
        </footer>
      </div>
  );
}