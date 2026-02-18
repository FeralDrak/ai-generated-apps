// ResourceStatus.js
import React from 'react';

const ResourceStatus = ({ resources }) => {
    return (
        <div className="resource-status">
            <div className="resource">
                <span className="icon energy"></span>
                <span className="value">{Math.floor(resources.energy)}</span>
                <span className="label">Énergie</span>
            </div>
            <div className="resource">
                <span className="icon minerals"></span>
                <span className="value">{Math.floor(resources.minerals)}</span>
                <span className="label">Minéraux</span>
            </div>
            <div className="resource">
                <span className="icon crystals"></span>
                <span className="value">{resources.exoticCrystals}</span>
                <span className="label">Cristaux</span>
            </div>
            <div className="resource">
                <span className="icon dark-matter"></span>
                <span className="value">{resources.darkMatter}</span>
                <span className="label">Matière Noire</span>
            </div>
            <div className="resource">
                <span className="icon artifacts"></span>
                <span className="value">{resources.artifacts}</span>
                <span className="label">Artefacts</span>
            </div>
        </div>
    );
};

export default ResourceStatus;