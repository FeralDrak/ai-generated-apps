import React from 'react';
import FortuneWheel from './FortuneWheel'; // Ajustez le chemin si nécessaire
import './App.css'; // Styles globaux si vous en avez

function App() {
  // Définissez les segments de votre roue
  // Peut être un simple tableau de strings
  // const wheelSegments = ["Pomme", "Banane", "Orange", "Fraise", "Raisin", "Ananas", "Cerise", "Kiwi"];

  // Ou un tableau d'objets pour spécifier les couleurs
  const wheelSegments = [
    { text: 'Prix A', color: '#FF0000' },
    { text: 'Bonus 10%', color: '#FFA500' },
    { text: 'Rejouer', color: '#FFFF00', contrastColor: "black" },
    { text: 'Petit Cadeau', color: '#008000' },
    { text: 'Rien :(', color: '#0000FF' },
    { text: 'Gros Lot!', color: '#4B0082' },
    { text: 'Coupon -5€', color: '#EE82EE' },
  ];

  const handleSpinStart = () => {
    console.log("La roue commence à tourner !");
  };

  const handleSpinEnd = (winner) => {
    console.log("La roue s'est arrêtée sur:", winner.text);
    // Vous pouvez déclencher une action ici, comme afficher un modal
    // alert(`Félicitations ! Vous avez gagné : ${winner.text}`);
  };

  return (
      <div className="App">
        <h1>Roue de la Fortune Personnalisée</h1>
        <FortuneWheel
            segments={wheelSegments}
            onSpinStart={handleSpinStart}
            onSpinEnd={handleSpinEnd}
            spinDuration={8} // Durée de rotation plus longue
            primaryColor="#333" // Couleur du pointeur et bouton
            contrastColor="white" // Couleur du texte sur les segments/bouton
            buttonText="Tenter ma chance !"
            size={350} // Taille plus grande
            baseSpins={7} // Plus de tours
            // showWinner={false} // Décommentez pour cacher le texte "Gagnant:" sous la roue
        />
        <p style={{ marginTop: '30px', textAlign: 'center' }}>
          Cliquez sur le bouton pour lancer la roue !
        </p>
      </div>
  );
}

export default App;