import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TransactionList from './modules/transactions/TransactionList';
import BudgetPlan from './modules/budget/BudgetPlan';
import FinancialHealthBoard from './modules/analysis/FinancialHealthBoard';
import { Transaction, Budget, Categories, api } from './utils/api';
import './App.css';

export interface FinanceContextType {
  transactions: Transaction[];
  budgets: Budget[];
  categories: Categories;
  refreshData: () => void;
}

export const FinanceContext = createContext<FinanceContextType | null>(null);

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};

function AppContent() {
  const location = useLocation();
  const [displayKey, setDisplayKey] = useState(location.pathname);

  useEffect(() => {
    setDisplayKey(location.pathname);
  }, [location.pathname]);

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div key={displayKey} className="page-fade-in">
          <Routes>
            <Route path="/" element={<TransactionList />} />
            <Route path="/budget" element={<BudgetPlan />} />
            <Route path="/analysis" element={<FinancialHealthBoard />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Categories>({ expense: [], income: [] });

  const refreshData = async () => {
    const [tx, bg, ct] = await Promise.all([
      api.getTransactions(),
      api.getBudgets(),
      api.getCategories(),
    ]);
    setTransactions(tx);
    setBudgets(bg);
    setCategories(ct);
  };

  useEffect(() => {
    refreshData();
  }, []);

  return (
    <FinanceContext.Provider value={{ transactions, budgets, categories, refreshData }}>
      <AppContent />
    </FinanceContext.Provider>
  );
}

export default App;
