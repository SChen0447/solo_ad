import { createContext, useContext, useReducer, ReactNode, useMemo, Dispatch } from 'react';
import {
  AppState,
  Action,
  Document,
  initialState,
  appReducer,
  createAddDocument,
  createUpdateDocument,
  getDocumentById,
  searchDocuments,
} from './store';

export interface AppContextType {
  state: AppState;
  dispatch: Dispatch<Action>;
  addDocument: (title: string, content: string, category: string) => void;
  updateDocument: (id: string, title: string, content: string) => void;
  deleteDocument: (id: string) => void;
  getDocument: (id: string) => Document | undefined;
  performSearch: (query: string) => Document[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addDocument = (title: string, content: string, category: string) => {
    const newDoc = createAddDocument(state, title, content, category);
    dispatch({ type: 'ADD_DOCUMENT', payload: newDoc });
  };

  const updateDocument = (id: string, title: string, content: string) => {
    const doc = getDocumentById(state.documents, id);
    if (!doc) return;
    const updated = createUpdateDocument(doc, state.currentUser, title, content);
    dispatch({ type: 'UPDATE_DOCUMENT', payload: updated });
  };

  const deleteDocument = (id: string) => {
    dispatch({ type: 'DELETE_DOCUMENT', payload: id });
  };

  const getDocument = (id: string) => {
    return getDocumentById(state.documents, id);
  };

  const performSearch = (query: string): Document[] => {
    const results = searchDocuments(state.documents, query);
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results });
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    return results;
  };

  const value = useMemo(
    () => ({
      state,
      dispatch,
      addDocument,
      updateDocument,
      deleteDocument,
      getDocument,
      performSearch,
    }),
    [state]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
