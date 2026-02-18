import React from 'react';
import './Header.css'; // Créez ce fichier CSS aussi

function Header() {
    return (
        <header className="app-header">
            <h1><span role="img" aria-label="star">🌟</span> EuroMillions : Vos Chances de Gagner <span role="img" aria-label="four-leaf-clover">🍀</span></h1>
            <p>Découvrez les probabilités pour chaque rang de gain.</p>
        </header>
    );
}

export default Header;