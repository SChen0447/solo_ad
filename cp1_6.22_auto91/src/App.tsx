import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import RecipeListPage from "@/pages/RecipeListPage"
import RecipeDetailPage from "@/pages/RecipeDetailPage"
import CreateRecipePage from "@/pages/CreateRecipePage"

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<RecipeListPage />} />
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        <Route path="/create" element={<CreateRecipePage />} />
      </Routes>
    </Router>
  )
}
