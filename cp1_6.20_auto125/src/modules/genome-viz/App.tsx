import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Chromosome3DScene } from './Chromosome3DScene';
import { GeneInfoPanel } from './GeneInfoPanel';
import { Legend } from './Legend';
import { fetchChromosomeStructure, fetchGeneDetail } from './dataFetcher';
import type { Gene, Position, ChromosomeStructure } from './types';

function App() {
  const [skeletonPoints, setSkeletonPoints] = useState<Position[]>([]);
  const [genes, setGenes] = useState<Gene[]>([]);
  const [selectedGene, setSelectedGene] = useState<Gene | null>(null);
  const [showHint, setShowHint] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data: ChromosomeStructure = await fetchChromosomeStructure();
        setSkeletonPoints(data.skeleton_points);
        setGenes(data.genes);
      } catch (error) {
        console.error('Failed to load chromosome structure:', error);
        generateFallbackData();
      } finally {
        setLoading(false);
      }
    };

    const generateFallbackData = () => {
      const points: Position[] = [];
      for (let i = 0; i < 60; i++) {
        let x: number, y: number, z: number;
        if (i < 30) {
          const armT = i / 29.0;
          const angle = armT * Math.PI * 1.5;
          const radius = 0.5 + armT * 1.5;
          x = Math.cos(angle) * radius;
          y = -3.0 + armT * 3.0;
          z = Math.sin(angle) * radius * 0.6;
        } else {
          const armT = (i - 30) / 29.0;
          const angle = armT * Math.PI * 1.5 + Math.PI;
          const radius = 0.5 + armT * 1.5;
          x = Math.cos(angle) * radius;
          y = -3.0 + armT * 3.0;
          z = Math.sin(angle) * radius * 0.6;
        }
        points.push({ x, y, z });
      }
      setSkeletonPoints(points);

      const categories: Gene['category'][] = ['transcription_factor', 'structural_protein', 'non_coding_rna'];
      const names = ['BRCA1', 'TP53', 'EGFR', 'MYC', 'KRAS', 'PTEN', 'CDKN2A', 'APC', 'RB1', 'BRCA2',
        'PIK3CA', 'NRAS', 'BRAF', 'MET', 'ALK', 'ROS1', 'HER2', 'VEGFA', 'PDGFRA', 'KIT',
        'FLT3', 'IDH1', 'IDH2', 'DNMT3A', 'TET2', 'RUNX1', 'NPM1', 'CEBPA', 'WT1', 'ASXL1',
        'EZH2', 'SF3B1', 'U2AF1', 'SRSF2', 'ZRSR2'];
      const diseasesPool = ['乳腺癌', '肺癌', '结直肠癌', '前列腺癌', '胰腺癌',
        '白血病', '淋巴瘤', '黑色素瘤', '卵巢癌', '胃癌'];
      const descriptions: Record<Gene['category'], string> = {
        transcription_factor: '该基因编码转录因子蛋白，通过结合特定DNA序列调控下游基因的转录表达，在细胞周期调控、细胞分化和发育过程中发挥关键作用。',
        structural_protein: '该基因编码结构蛋白，参与细胞骨架组成、核基质构建及染色质高级结构维持。作为细胞内重要的机械支撑成分，它确保染色体正确分离和细胞核形态稳定。',
        non_coding_rna: '该基因转录产生非编码RNA分子，不翻译为蛋白质但具有重要调控功能。可通过表观遗传修饰、转录后调控等方式在基因表达网络中充当关键调节因子。'
      };

      const mockGenes: Gene[] = [];
      for (let i = 0; i < 35; i++) {
        const pointIdx = Math.floor(Math.random() * 60);
        const point = points[pointIdx];
        const category = categories[i % 3];
        const numDiseases = 1 + Math.floor(Math.random() * 4);
        const shuffled = [...diseasesPool].sort(() => Math.random() - 0.5);

        mockGenes.push({
          id: `GENE${i + 1}`,
          name: names[i % names.length],
          category,
          position: {
            x: point.x + (Math.random() - 0.5) * 0.4,
            y: point.y + (Math.random() - 0.5) * 0.4,
            z: point.z + (Math.random() - 0.5) * 0.4,
          },
          description: descriptions[category],
          diseases: shuffled.slice(0, numDiseases),
        });
      }
      setGenes(mockGenes);
    };

    loadData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowHint(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleGeneClick = async (geneId: string) => {
    const geneFromList = genes.find((g) => g.id === geneId);
    if (geneFromList) {
      setSelectedGene(geneFromList);
    }
    try {
      const detailedGene = await fetchGeneDetail(geneId);
      setSelectedGene(detailedGene);
    } catch (error) {
      console.error(`Failed to fetch detail for gene ${geneId}:`, error);
    }
  };

  const handleClosePanel = () => {
    setSelectedGene(null);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a2e',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      >
        {loading ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#8080a0',
              fontSize: '16px',
            }}
          >
            正在加载染色体数据...
          </div>
        ) : (
          <Chromosome3DScene
            skeletonPoints={skeletonPoints}
            genes={genes}
            onGeneClick={handleGeneClick}
          />
        )}
      </div>

      <Legend />

      {showHint && !selectedGene && (
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#8080a0',
            fontSize: '14px',
            background: 'transparent',
            padding: '10px 24px',
            borderRadius: '20px',
            pointerEvents: 'none',
            animation: 'fadeOutHint 5s ease-in-out forwards',
            zIndex: 40,
          }}
        >
          点击基因位点查看详情
          <style>
            {`
              @keyframes fadeOutHint {
                0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                85% { opacity: 1; }
                100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
              }
            `}
          </style>
        </div>
      )}

      <GeneInfoPanel gene={selectedGene} onClose={handleClosePanel} />
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<App />);
}

export default App;
