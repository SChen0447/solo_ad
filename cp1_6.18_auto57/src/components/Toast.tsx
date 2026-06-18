import { useRecipeStore } from '../store/recipeStore';
import './Toast.css';

export function Toast() {
  const toasts = useRecipeStore(s => s.toasts);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div key={toast.id} className="toast toast--enter">
          <i className="fa-solid fa-circle-check" style={{ marginRight: 8 }}></i>
          {toast.text}
        </div>
      ))}
    </div>
  );
}
