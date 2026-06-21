import { useState, useEffect, useCallback } from 'react';
import CatCard from './components/CatCard';
import ToyList from './components/ToyList';
import ToyDetail from './components/ToyDetail';
import RecommendationSection from './components/RecommendationSection';
import AddCatModal from './components/AddCatModal';
import AddToyModal from './components/AddToyModal';
import {
  Cat, Toy, InteractionRecord,
  getCats, addCat, deleteCat,
  getToysByCatId, addToy, deleteToy,
  addInteraction,
} from './utils/database';

type Route =
  | { name: 'home' }
  | { name: 'catDetail'; catId: number }
  | { name: 'toyDetail'; catId: number; toyId: number };

function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [cats, setCats] = useState<Cat[]>([]);
  const [toys, setToys] = useState<Record<number, Toy[]>>({});
  const [showAddCat, setShowAddCat] = useState(false);
  const [showAddToy, setShowAddToy] = useState(false);
  const [isDbReady, setIsDbReady] = useState(false);

  const loadCats = useCallback(() => {
    const result = getCats();
    setCats(result);
    setIsDbReady(true);
  }, []);

  const loadToysForCat = useCallback((catId: number) => {
    const result = getToysByCatId(catId);
    setToys(prev => ({ ...prev, [catId]: result }));
  }, []);

  useEffect(() => {
    loadCats();
  }, [loadCats]);

  const handleAddCat = useCallback((catData: {
    name: string; breed: string; age: number;
    personality: string[]; avatar?: string;
  }) => {
    const newCat = addCat(catData);
    setCats(prev => [newCat, ...prev]);
    loadToysForCat(newCat.id);
    setShowAddCat(false);
  }, [loadToysForCat]);

  const handleDeleteCat = useCallback((catId: number) => {
    if (window.confirm('确定要删除这只猫咪吗？相关玩具和记录也会被删除。')) {
      deleteCat(catId);
      setCats(prev => prev.filter(c => c.id !== catId));
      setToys(prev => {
        const next = { ...prev };
        delete next[catId];
        return next;
      });
      if (route.name !== 'home') {
        setRoute({ name: 'home' });
      }
    }
  }, [route]);

  const handleCatClick = useCallback((catId: number) => {
    if (!toys[catId]) {
      loadToysForCat(catId);
    }
    setRoute({ name: 'catDetail', catId });
  }, [toys, loadToysForCat]);

  const handleAddToy = useCallback((toyData: {
    name: string; type: any; material: any;
    danger_level: any; image?: string; description?: string;
  }) => {
    if (route.name === 'catDetail') {
      const newToy = addToy({ ...toyData, cat_id: route.catId, is_custom: 1 });
      setToys(prev => ({
        ...prev,
        [route.catId]: [newToy, ...(prev[route.catId] || [])],
      }));
    }
    setShowAddToy(false);
  }, [route]);

  const handleDeleteToy = useCallback((toyId: number) => {
    if (window.confirm('确定要删除这个玩具吗？相关互动记录也会被删除。')) {
      if (route.name === 'catDetail' || route.name === 'toyDetail') {
        const catId = route.catId;
        deleteToy(toyId);
        setToys(prev => ({
          ...prev,
          [catId]: (prev[catId] || []).filter(t => t.id !== toyId),
        }));
        if (route.name === 'toyDetail' && route.toyId === toyId) {
          setRoute({ name: 'catDetail', catId });
        }
      }
    }
  }, [route]);

  const handleRecordInteraction = useCallback((
    toyId: number,
    data: { duration: number; reaction: any; damaged: boolean }
  ) => {
    if (route.name === 'catDetail' || route.name === 'toyDetail') {
      const record: Omit<InteractionRecord, 'id' | 'created_at'> = {
        toy_id: toyId,
        cat_id: route.catId,
        duration: data.duration,
        reaction: data.reaction,
        damaged: data.damaged ? 1 : 0,
      };
      addInteraction(record);
      
      if (route.name === 'toyDetail') {
        const catId = route.catId;
        loadToysForCat(catId);
      } else if (route.name === 'catDetail') {
        loadToysForCat(route.catId);
      }
    }
  }, [route, loadToysForCat]);

  const handleToyClick = useCallback((toyId: number) => {
    if (route.name === 'catDetail') {
      setRoute({ name: 'toyDetail', catId: route.catId, toyId });
    }
  }, [route]);

  const handleBack = useCallback(() => {
    if (route.name === 'toyDetail') {
      setRoute({ name: 'catDetail', catId: route.catId });
    } else if (route.name === 'catDetail') {
      setRoute({ name: 'home' });
    }
  }, [route]);

  const currentCat = cats.find(c =>
    (route.name === 'catDetail' || route.name === 'toyDetail') && c.id === route.catId
  );
  const currentToys = route.name !== 'home' ? (toys[route.catId] || []) : [];
  const currentToy = route.name === 'toyDetail'
    ? currentToys.find(t => t.id === route.toyId)
    : null;

  return (
    <div className="app">
      <div className="container">
        <header className="app-header">
          {route.name !== 'home' ? (
            <button className="back-btn" onClick={handleBack}>
              ← 返回
            </button>
          ) : null}
          <h1 className="app-title">
            {route.name === 'home' && '🐱 猫咪玩具库'}
            {route.name === 'catDetail' && currentCat && `${currentCat.name}的玩具库`}
            {route.name === 'toyDetail' && currentToy && currentToy.name}
          </h1>
          <div className="header-actions">
            {route.name === 'home' && (
              <button className="primary-btn" onClick={() => setShowAddCat(true)}>
                + 添加猫咪
              </button>
            )}
            {route.name === 'catDetail' && (
              <button className="primary-btn" onClick={() => setShowAddToy(true)}>
                + 添加玩具
              </button>
            )}
          </div>
        </header>

        <main>
          {route.name === 'home' && (
            <>
              <section className="section">
                <h2 className="section-title">我的猫咪</h2>
                {cats.length === 0 ? (
                  <div className="empty-state">
                    <p>还没有添加猫咪，点击右上角按钮添加你的第一只猫咪吧！</p>
                  </div>
                ) : (
                  <div className="cat-grid">
                    {cats.map(cat => (
                      <CatCard
                        key={cat.id}
                        cat={cat}
                        onClick={() => handleCatClick(cat.id)}
                        onDelete={() => handleDeleteCat(cat.id)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <RecommendationSection
                cats={cats}
                onAddCat={() => setShowAddCat(true)}
              />
            </>
          )}

          {route.name === 'catDetail' && currentCat && (
            <ToyList
              toys={currentToys}
              cat={currentCat}
              onToyClick={handleToyClick}
              onRecordInteraction={handleRecordInteraction}
              onDeleteToy={handleDeleteToy}
            />
          )}

          {route.name === 'toyDetail' && currentCat && currentToy && (
            <ToyDetail
              toy={currentToy}
              cat={currentCat}
              onRecordInteraction={handleRecordInteraction}
              onDelete={() => handleDeleteToy(currentToy.id)}
            />
          )}
        </main>
      </div>

      {showAddCat && (
        <AddCatModal
          onClose={() => setShowAddCat(false)}
          onSubmit={handleAddCat}
        />
      )}

      {showAddToy && (
        <AddToyModal
          onClose={() => setShowAddToy(false)}
          onSubmit={handleAddToy}
        />
      )}
    </div>
  );
}

export default App;
