import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import TimelineEditor from "@/components/TimelineEditor";
import StoryBookViewer from "@/components/StoryBookViewer";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/editor" element={<TimelineEditor />} />
        <Route path="/storybook" element={<StoryBookViewer />} />
      </Routes>
    </Router>
  );
}
