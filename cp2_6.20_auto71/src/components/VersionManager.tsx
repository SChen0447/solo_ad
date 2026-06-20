import React, { useRef } from "react";

interface VersionItem {
  id: string;
  thumbnailUrl: string;
  fullUrl: string;
  fileName: string;
  width: number;
  height: number;
  uploadTime: number;
  versionNumber: string;
}

interface VersionManagerProps {
  versionList: VersionItem[];
  selectedIds: [string, string];
  onSelectVersion: (id: string, index: number) => void;
  onUpload: () => void;
}

const VersionManager: React.FC<VersionManagerProps> = ({
  versionList,
  selectedIds,
  onSelectVersion,
  onUpload,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${mm}/${dd}`;
  };

  const isActive = (id: string): boolean => selectedIds.includes(id);

  return (
    <div className="timeline-area">
      <div className="timeline-header">
        <span className="timeline-title">Version Timeline</span>
        <button onClick={onUpload}>Upload</button>
      </div>
      <div className="timeline-scroll" ref={scrollRef}>
        <div className="timeline-nodes">
          {versionList.map((version, index) => {
            const active = isActive(version.id);
            const selectedIndex = selectedIds.indexOf(version.id);

            return (
              <React.Fragment key={version.id}>
                <div
                  className={`timeline-node${active ? " active" : ""}`}
                  onClick={() => onSelectVersion(version.id, selectedIndex >= 0 ? selectedIndex : 0)}
                >
                  <div
                    className="node-thumb"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      border: `2px solid ${active ? "#6C63FF" : "transparent"}`,
                      backgroundImage: `url(${version.thumbnailUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                  <span
                    className="node-version"
                    style={{
                      color: active ? "#6C63FF" : undefined,
                      fontWeight: active ? "bold" : undefined,
                    }}
                  >
                    {version.versionNumber}
                  </span>
                  <span className="node-date">
                    {formatDate(version.uploadTime)}
                  </span>
                </div>
                {index < versionList.length - 1 && (
                  <div className="timeline-connector" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VersionManager;
