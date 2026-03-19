// src/components/ExploreContainer.tsx
import './ExploreContainer.css';
import React from "react";

const ExploreContainer: React.FC<object> = () => {
    return (
        <div id="container">
            <strong>Ready to create an app?</strong>
            <p>Start with Ionic <a target="_blank" rel="noopener noreferrer" href="https://ionicframework.com/docs/components">UI Components</a></p>
        </div>
    );
};

export default ExploreContainer;