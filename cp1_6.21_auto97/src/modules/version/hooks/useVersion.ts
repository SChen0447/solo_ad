import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { Version, VersionStatus, DiffResult } from '../types';
import { computeDiff } from '../utils/diff';
import { generateVersionSummary } from '../utils/conflict';

export function useVersion(initialVersions: Version[] = []) {
  const [versions, setVersions] = useState<Version[]>(initialVersions);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [compareVersionIds, setCompareVersionIds] = useState<string[]>([]);

  const currentVersion = useMemo(() => {
    if (!selectedVersionId) return null;
    return versions.find(v => v.id === selectedVersionId) || null;
  }, [versions, selectedVersionId]);

  const latestVersion = useMemo(() => {
    if (versions.length === 0) return null;
    return versions.reduce((latest, v) => 
      v.versionNumber > latest.versionNumber ? v : latest
    , versions[0]);
  }, [versions]);

  const isViewingOldVersion = useMemo(() => {
    if (!selectedVersionId || !latestVersion) return false;
    return selectedVersionId !== latestVersion.id;
  }, [selectedVersionId, latestVersion]);

  const createVersion = useCallback((code: string, createdBy: string = 'me'): Version => {
    const newVersion: Version = {
      id: uuidv4(),
      versionNumber: versions.length + 1,
      code,
      timestamp: new Date().toISOString(),
      summary: generateVersionSummary(code),
      status: 'latest',
      createdBy,
    };

    setVersions(prev => {
      const updated = prev.map(v => ({
        ...v,
        status: 'normal' as VersionStatus,
      }));
      return [...updated, newVersion];
    });

    return newVersion;
  }, [versions.length]);

  const addVersion = useCallback((version: Version) => {
    setVersions(prev => {
      const updated = prev.map(v => ({
        ...v,
        status: v.status === 'latest' ? 'normal' as VersionStatus : v.status,
      }));
      return [...updated, { ...version, status: 'latest' as VersionStatus }];
    });
  }, []);

  const selectVersion = useCallback((versionId: string | null) => {
    setSelectedVersionId(versionId);
  }, []);

  const toggleCompareVersion = useCallback((versionId: string) => {
    setCompareVersionIds(prev => {
      if (prev.includes(versionId)) {
        return prev.filter(id => id !== versionId);
      }
      if (prev.length >= 2) {
        return [prev[1], versionId];
      }
      return [...prev, versionId];
    });
  }, []);

  const clearCompareSelection = useCallback(() => {
    setCompareVersionIds([]);
  }, []);

  const compareVersions = useCallback((): DiffResult | null => {
    if (compareVersionIds.length !== 2) return null;
    
    const v1 = versions.find(v => v.id === compareVersionIds[0]);
    const v2 = versions.find(v => v.id === compareVersionIds[1]);
    
    if (!v1 || !v2) return null;
    
    return computeDiff(v1.code, v2.code);
  }, [compareVersionIds, versions]);

  const getVersionById = useCallback((id: string): Version | undefined => {
    return versions.find(v => v.id === id);
  }, [versions]);

  const formatVersionTime = useCallback((timestamp: string): string => {
    return format(new Date(timestamp), 'yyyy-MM-dd HH:mm');
  }, []);

  const setVersionsList = useCallback((newVersions: Version[]) => {
    setVersions(newVersions);
  }, []);

  return {
    versions,
    currentVersion,
    latestVersion,
    isViewingOldVersion,
    selectedVersionId,
    compareVersionIds,
    createVersion,
    addVersion,
    selectVersion,
    toggleCompareVersion,
    clearCompareSelection,
    compareVersions,
    getVersionById,
    formatVersionTime,
    setVersionsList,
  };
}
