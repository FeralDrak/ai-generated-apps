import React from 'react';
import './App.css';
import ProbabilityCard from './components/ProbabilityCard';
import Header from './components/Header'; // Importer le Header

// Données des probabilités EuroMillions (source: FDJ / Wikipedia, à vérifier pour les dernières règles si elles changent)
// Total combinations: C(50, 5) * C(12, 2) = 2,118,760 * 66 = 139,838,160
const probabilities = [
  { rank: 1, numbers: 5, stars: 2, odds: 139838160, probability: "0.000000715%" },
  { rank: 2, numbers: 5, stars: 1, odds: 6991908, probability: "0.0000143%" }, // 1/(C(50,5) * C(2,1)*C(10,1))? No, simpler: (1*2*10)/Tot = 20/Tot? Let's use official odds. Odds = 139,838,160 / 20
  { rank: 3, numbers: 5, stars: 0, odds: 3107515, probability: "0.0000322%" }, // Odds = 139,838,160 / 45
  { rank: 4, numbers: 4, stars: 2, odds: 621503, probability: "0.000161%" }, // C(5,4)*C(45,1) * C(2,2) = 5*45*1 = 225. Odds = 139,838,160 / 225
  { rank: 5, numbers: 4, stars: 1, odds: 31075, probability: "0.00322%" },   // C(5,4)*C(45,1) * C(2,1)*C(10,1) = 5*45*2*10 = 4500. Odds = 139,838,160 / 4500
  { rank: 6, numbers: 3, stars: 2, odds: 14125, probability: "0.00708%" },  // C(5,3)*C(45,2) * C(2,2) = 10 * 990 * 1 = 9900. Odds = 139,838,160 / 9900
  { rank: 7, numbers: 4, stars: 0, odds: 13811, probability: "0.00724%" },  // C(5,4)*C(45,1) * C(10,2) = 5 * 45 * 45 = 10125. Odds = 139,838,160 / 10125
  { rank: 8, numbers: 2, stars: 2, odds: 985, probability: "0.101%" },     // C(5,2)*C(45,3) * C(2,2) = 10 * 14190 * 1 = 141900. Odds = 139,838,160 / 141900
  { rank: 9, numbers: 3, stars: 1, odds: 706, probability: "0.141%" },     // C(5,3)*C(45,2) * C(2,1)*C(10,1) = 10 * 990 * 2 * 10 = 198000. Odds = 139,838,160 / 198000
  { rank: 10, numbers: 3, stars: 0, odds: 314, probability: "0.319%" },    // C(5,3)*C(45,2) * C(10,2) = 10 * 990 * 45 = 445500. Odds = 139,838,160 / 445500
  { rank: 11, numbers: 1, stars: 2, odds: 188, probability: "0.532%" },    // C(5,1)*C(45,4) * C(2,2) = 5 * 148995 * 1 = 744975. Odds = 139,838,160 / 744975
  { rank: 12, numbers: 2, stars: 1, odds: 49, probability: "2.039%" },     // C(5,2)*C(45,3) * C(2,1)*C(10,1) = 10 * 14190 * 2 * 10 = 2838000. Odds = 139,838,160 / 2838000
  { rank: 13, numbers: 2, stars: 0, odds: 22, probability: "4.579%" },     // C(5,2)*C(45,3) * C(10,2) = 10 * 14190 * 45 = 6385500. Odds = 139,838,160 / 6385500
];

// Chance globale de gagner (n'importe quel prix)
const overallOdds = 13; // Environ 1 chance sur 13

function App() {
  return (
      <div className="App">
        <Header /> {/* Ajout du Header */}
        <main className="probability-grid">
          {probabilities.map((prob) => (
              <ProbabilityCard
                  key={prob.rank}
                  rank={prob.rank}
                  matches={`${prob.numbers} + ${prob.stars}`} // Pass combined string or individual numbers/stars
                  numbers={prob.numbers}
                  stars={prob.stars}
                  probability={prob.probability}
                  odds={prob.odds}
              />
          ))}
        </main>
        <footer className="app-footer">
          <p>Nombre total de combinaisons possibles : <strong>139 838 160</strong></p>
          <p>Chance globale de remporter un gain : environ <strong>1 sur {overallOdds}</strong>.</p>
          <p><small>Les probabilités sont approximatives et basées sur les règles standard de l'EuroMillions. Vérifiez toujours les règles officielles.</small></p>
        </footer>
      </div>
  );
}

export default App;