import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Inventory from './pages/Inventory';
import Recommend from './pages/Recommend';
import Cooking from './pages/Cooking';
import Family from './pages/Family';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navbar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Inventory />} />
            <Route path="/recommend" element={<Recommend />} />
            <Route path="/cooking/:id" element={<Cooking />} />
            <Route path="/family" element={<Family />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
