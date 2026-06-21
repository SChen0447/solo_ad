import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import HomePage from "@/pages/HomePage";
import ExplorePage from "@/pages/ExplorePage";
import RouteDetailPage from "@/pages/RouteDetailPage";
import CreatePage from "@/pages/CreatePage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#f0f4f8]">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/route/:id" element={<RouteDetailPage />} />
          <Route path="/create" element={<CreatePage />} />
        </Routes>
      </div>
    </Router>
  );
}
