import { useState, useCallback } from 'react';
import axios from 'axios';
import { ClusterResult, GroupData } from '../types';

const GROUP_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
  '#dfe6e9',
  '#a29bfe',
  '#fd79a8',
  '#00b894',
  '#e17055'
];

export const useClusterEngine = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clusterResult, setClusterResult] = useState<ClusterResult | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);

  const getClusters = useCallback(async (texts: string[], method: 'similarity' | 'tags' = 'similarity') => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post<ClusterResult>('/api/cluster', {
        texts,
        method,
        n_clusters: Math.min(8, Math.max(2, Math.floor(texts.length / 4)))
      });

      const result = response.data;
      setClusterResult(result);

      const groupList: GroupData[] = Object.entries(result.group_names).map(([id, name]) => {
        const groupId = parseInt(id, 10);
        return {
          groupId,
          groupName: name,
          size: result.group_sizes[id] || 0,
          color: GROUP_COLORS[groupId % GROUP_COLORS.length]
        };
      });

      setGroups(groupList.sort((a, b) => a.groupId - b.groupId));
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '聚类请求失败';
      setError(message);
      console.error('Cluster error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearClusters = useCallback(() => {
    setClusterResult(null);
    setGroups([]);
    setError(null);
  }, []);

  const getGroupColor = useCallback((groupId: number | undefined): string => {
    if (groupId === undefined) return 'transparent';
    return GROUP_COLORS[groupId % GROUP_COLORS.length];
  }, []);

  return {
    isLoading,
    error,
    clusterResult,
    groups,
    getClusters,
    clearClusters,
    getGroupColor
  };
};
