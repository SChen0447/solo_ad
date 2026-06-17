import { BrowserRouter as Router, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import Home from '@/pages/Home';
import RecipeDetail from '@/components/RecipeDetail';
import AddRecipe from '@/components/AddRecipe';
import { useRecipeStore } from '@/store/recipeStore';

function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const getRecipe = useRecipeStore(state => state.getRecipe);
  const recipe = id ? getRecipe(id) : undefined;

  if (!recipe) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
        <p style={{ fontSize: 18, marginBottom: 16 }}>食谱不存在</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          返回首页
        </button>
      </div>
    );
  }

  return <RecipeDetail recipe={recipe} onBack={() => navigate('/')} />;
}

function AddRecipePage() {
  const navigate = useNavigate();
  return <AddRecipe onClose={() => navigate('/')} />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipe/:id" element={<RecipeDetailPage />} />
        <Route path="/add" element={<AddRecipePage />} />
      </Routes>
    </Router>
  );
}
