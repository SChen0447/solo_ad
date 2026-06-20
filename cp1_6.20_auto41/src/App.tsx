import React, { useState, useEffect, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { BoardData, Task, boardApi, socketService } from "./api";
import BoardPage from "./pages/BoardPage";

const App: React.FC = () => {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await boardApi.getBoard();
      setBoardData(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `无法连接到后端服务: ${err.message}`
          : "加载看板数据失败"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  useEffect(() => {
    if (!boardData) return;

    socketService.connect();

    const offTaskMoved = socketService.onTaskMoved((data) => {
      setBoardData((prev) => {
        if (!prev) return prev;
        const updatedTasks: Task[] = data.tasks.map((t) => ({
          ...t,
        }));
        return { ...prev, tasks: updatedTasks };
      });

      setTimeout(() => {
        setBoardData((prev) => prev);
      }, 400);
    });

    const offTaskAdded = socketService.onTaskAdded((data) => {
      setBoardData((prev) => {
        if (!prev) return prev;
        return { ...prev, tasks: [...prev.tasks, data.task] };
      });
    });

    const offBurndownUpdated = socketService.onBurndownUpdated((data) => {
      setBoardData((prev) => {
        if (!prev) return prev;
        return { ...prev, burndown_data: data.burndown_data };
      });
    });

    return () => {
      offTaskMoved();
      offTaskAdded();
      offBurndownUpdated();
      socketService.disconnect();
    };
  }, [boardData !== null]);

  const handleBoardUpdate = useCallback((data: BoardData) => {
    setBoardData(data);
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1a2e",
          color: "#e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "3px solid rgba(102, 126, 234, 0.2)",
            borderTopColor: "#667eea",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p style={{ color: "#718096", fontSize: "14px", margin: 0 }}>
          正在加载看板数据...
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error || !boardData) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1a2e",
          color: "#e0e0e0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "20px",
          padding: "24px",
        }}
      >
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
        <div style={{ textAlign: "center", maxWidth: "400px" }}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "18px",
              fontWeight: 600,
              color: "#fff",
            }}
          >
            加载失败
          </h2>
          <p style={{ margin: "0 0 20px", fontSize: "14px", color: "#718096" }}>
            {error || "请确保后端 Flask 服务已在端口 5000 启动"}
          </p>
          <button
            onClick={fetchBoardData}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 500,
              boxShadow: "0 4px 14px rgba(102, 126, 234, 0.4)",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(-1px)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 6px 20px rgba(102, 126, 234, 0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.transform =
                "translateY(0)";
              (e.currentTarget as HTMLElement).style.boxShadow =
                "0 4px 14px rgba(102, 126, 234, 0.4)";
            }}
          >
            重新连接
          </button>
        </div>
      </div>
    );
  }

  return (
    <React.StrictMode>
      <BoardPage boardData={boardData} onBoardUpdate={handleBoardUpdate} />
    </React.StrictMode>
  );
};

const container = document.getElementById("root");
if (container) {
  ReactDOM.createRoot(container).render(<App />);
}

export default App;
