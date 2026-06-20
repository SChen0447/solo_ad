import React from "react";
import { motion } from "framer-motion";
import type { SpeciesSummary } from "../types";

interface SpeciesCardProps {
  species: SpeciesSummary;
  isSelected: boolean;
  onClick: () => void;
}

const thumbnailColors: Record<string, string> = {
  ginkgo: "#C8E6C9",
  oak: "#A5D6A7",
  pine: "#81C784",
  maple: "#EF9A9A",
};

const SpeciesCard: React.FC<SpeciesCardProps> = ({ species, isSelected, onClick }) => {
  return (
    <motion.div
      onClick={onClick}
      animate={{
        scale: isSelected ? 1.05 : 1,
        opacity: isSelected ? 1 : 0.75,
      }}
      transition={{ duration: 0.3 }}
      style={{
        width: 120,
        height: 160,
        borderRadius: 12,
        overflow: "hidden",
        cursor: "pointer",
        flexShrink: 0,
        background: isSelected
          ? "linear-gradient(135deg, #4ECDC4 0%, #2E8B7A 100%)"
          : "#2C2C2C",
        border: isSelected ? "2px solid #4ECDC4" : "2px solid #444",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: 8,
          background: thumbnailColors[species.thumbnail] || "#666",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          marginBottom: 8,
        }}
      >
        {species.thumbnail === "ginkgo" && "🌿"}
        {species.thumbnail === "oak" && "🌳"}
        {species.thumbnail === "pine" && "🌲"}
        {species.thumbnail === "maple" && "🍁"}
      </div>
      <div
        style={{
          color: isSelected ? "#fff" : "#CCCCCC",
          fontSize: 14,
          fontWeight: 600,
          textAlign: "center",
        }}
      >
        {species.name}
      </div>
      <div
        style={{
          color: isSelected ? "#E0E0E0" : "#999",
          fontSize: 11,
          textAlign: "center",
        }}
      >
        {species.nameEn}
      </div>
    </motion.div>
  );
};

interface SpeciesSelectorProps {
  species: SpeciesSummary[];
  selectedId: string;
  onSelect: (id: string) => void;
}

const SpeciesSelector: React.FC<SpeciesSelectorProps> = ({
  species,
  selectedId,
  onSelect,
}) => {
  return (
    <div
      style={{
        height: 120,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "0 16px",
        overflowX: "auto",
        background: "rgba(26,26,46,0.9)",
        borderBottom: "1px solid #333",
        flexWrap: "nowrap",
      }}
      className="species-selector"
    >
      {species.map((s) => (
        <SpeciesCard
          key={s.id}
          species={s}
          isSelected={s.id === selectedId}
          onClick={() => onSelect(s.id)}
        />
      ))}
    </div>
  );
};

export default SpeciesSelector;
