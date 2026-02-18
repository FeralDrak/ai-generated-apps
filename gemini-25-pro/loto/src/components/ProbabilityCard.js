import React from 'react';
import './ProbabilityCard.css';

// Helper function to format large numbers
const formatNumber = (num) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

function ProbabilityCard({ rank, matches, numbers, stars, probability, odds }) {
    // Simple visual representation based on rank (less likely = smaller bar visually)
    // This is purely illustrative, not to scale.
    const visualScale = Math.max(1, 15 - rank); // Rank 1 gets smallest bar, Rank 13 largest (adjust as needed)

    return (
        <div className="probability-card">
            <div className="card-rank">Rang {rank}</div>
            <div className="card-matches">
                <span className="match-numbers">{numbers} <span className="label">numéros</span></span>
                {stars !== null && ( // Only show stars if applicable
                    <>
                        <span className="plus">+</span>
                        <span className="match-stars">{stars} <span className="label">{stars === 1 ? 'étoile' : 'étoiles'}</span></span>
                    </>
                )}
            </div>
            <div className="card-probability">
                <span className="odds-label">1 chance sur</span>
                <span className="odds-value">{formatNumber(odds)}</span>
            </div>
            {/* Optional: Simple visual bar */}
            {/* <div className="card-visual-bar-container">
        <div className="card-visual-bar" style={{ width: `${visualScale * 5}%` }}></div>
      </div> */}
            <div className="card-info">
                Probabilité ≈ {probability}
            </div>
        </div>
    );
}

export default ProbabilityCard;