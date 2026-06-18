import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Library } from './components/Library';
import { BookSearch } from './components/BookSearch';
import { BookingFlow } from './components/BookingFlow';
import { MapView } from './components/MapView';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Library />}>
          <Route index element={<BookSearch />} />
          <Route path="booking" element={<BookingFlow />} />
          <Route path="map" element={<MapView />} />
          <Route path="map/:bookId" element={<MapView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
