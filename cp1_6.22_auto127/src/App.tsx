import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import FleetBuilder from "@/pages/FleetBuilder";
import MatchWaiting from "@/pages/MatchWaiting";
import Battle from "@/pages/Battle";
import Result from "@/pages/Result";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<FleetBuilder />} />
        <Route path="/match" element={<MatchWaiting />} />
        <Route path="/battle" element={<Battle />} />
        <Route path="/result" element={<Result />} />
      </Routes>
    </Router>
  );
}
