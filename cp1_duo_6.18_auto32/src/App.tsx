import React from 'react';
import { MapRenderer } from './mapRenderer';
import { TimelineController } from './timelineController';
import { FileUpload } from './components/FileUpload';
import { PhotoGallery } from './components/PhotoGallery';
import { useTravelStore } from './store';

function App(): JSX.Element {
  const travelData = useTravelStore((state) => state.travelData);
  const hasData = travelData.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🌍 环球旅行时间线</h1>
        <p className="app-subtitle">交互式地理数据可视化</p>
      </header>

      <main className="app-main">
        {!hasData ? (
          <div className="upload-section">
            <FileUpload />
          </div>
        ) : (
          <div className="content-section">
            <div className="map-section">
              <MapRenderer />
            </div>
            <div className="control-section">
              <TimelineController />
              <div className="action-buttons">
                <button
                  className="btn-reset"
                  onClick={() => useTravelStore.getState().setTravelData([])}
                >
                  重新上传
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <PhotoGallery />
    </div>
  );
}

export default App;
