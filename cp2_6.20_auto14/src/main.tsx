import React from 'react';
import ReactDOM from 'react-dom/client';
import UILayer from './UILayer';
import { v4 as uuidv4 } from 'uuid';

const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #0ea5e9;
    cursor: pointer;
    box-shadow: 0 0 8px rgba(14, 165, 233, 0.6);
    transition: transform 0.1s ease;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #0ea5e9;
    cursor: pointer;
    border: none;
    box-shadow: 0 0 8px rgba(14, 165, 233, 0.6);
  }

  ::-webkit-scrollbar {
    width: 6px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 3px;
  }

  ::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  button:hover {
    filter: brightness(1.1);
  }

  button:active {
    transform: scale(0.96);
  }

  * {
    -webkit-user-select: none;
    user-select: none;
  }

  input {
    -webkit-user-select: text;
    user-select: text;
  }
`;
document.head.appendChild(style);

const userId = uuidv4();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <UILayer userId={userId} userName="我" />
  </React.StrictMode>
);
