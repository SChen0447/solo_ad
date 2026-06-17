import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
});

export { socket };

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App socket={socket} />
  </React.StrictMode>
);
