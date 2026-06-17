import { useMemo, useCallback, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppContext } from '../context/AppContext';
import type { Excerpt, ExcerptType, Tag, Annotation, TagColor } from '../types';

export function detectContentType(content: string): ExcerptType {
  const trimmed = content.trim();
  const imagePattern = /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i;
  const videoPattern = /(youtube\.com|youtu\.be|vimeo\.com|bilibili\.com)/i;
  const urlPattern = /^(https?:\/\/)/i;

  if (urlPattern.test(trimmed)) {
    if (imagePattern.test(trimmed)) return 'image';
    if (videoPattern.test(trimmed)) return 'video';
    return 'text';
  }
  return 'text';
}

export function useCollection() {
  const { state, dispatch } = useAppContext();
  const [debouncedQuery, setDebouncedQuery] = useState(state.searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(state.searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [state.searchQuery]);

  const filteredExcerpts = useMemo(() => {
    let result = [...state.excerpts];

    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter(
        e =>
          e.title.toLowerCase().includes(query) ||
          e.content.toLowerCase().includes(query) ||
          e.tags.some(t => t.name.toLowerCase().includes(query))
      );
    }

    if (state.selectedTagId) {
      result = result.filter(e => e.tags.some(t => t.id === state.selectedTagId));
    }

    return result.sort((a, b) => b.createdAt - a.createdAt);
  }, [state.excerpts, debouncedQuery, state.selectedTagId]);

  const addExcerpt = useCallback(
    (content: string, title: string = '', sourceUrl: string = '') => {
      const type = detectContentType(content);
      const excerpt: Excerpt = {
        id: uuidv4(),
        type,
        title: title || content.slice(0, 50),
        content,
        sourceUrl: sourceUrl || window.location.href,
        createdAt: Date.now(),
        tags: [],
        annotations: [],
        relatedCardIds: [],
      };
      dispatch({ type: 'ADD_EXCERPT', payload: excerpt });
      return excerpt;
    },
    [dispatch]
  );

  const deleteExcerpt = useCallback(
    (id: string) => {
      dispatch({ type: 'DELETE_EXCERPT', payload: id });
    },
    [dispatch]
  );

  const updateExcerpt = useCallback(
    (excerpt: Excerpt) => {
      dispatch({ type: 'UPDATE_EXCERPT', payload: excerpt });
    },
    [dispatch]
  );

  const addTag = useCallback(
    (excerptId: string, name: string, color: TagColor) => {
      const tag: Tag = { id: uuidv4(), name, color };
      dispatch({ type: 'ADD_TAG_TO_EXCERPT', payload: { excerptId, tag } });
      return tag;
    },
    [dispatch]
  );

  const removeTag = useCallback(
    (excerptId: string, tagId: string) => {
      dispatch({ type: 'REMOVE_TAG_FROM_EXCERPT', payload: { excerptId, tagId } });
    },
    [dispatch]
  );

  const addAnnotation = useCallback(
    (excerptId: string, content: string) => {
      const annotation: Annotation = {
        id: uuidv4(),
        content,
        createdAt: Date.now(),
      };
      dispatch({ type: 'ADD_ANNOTATION', payload: { excerptId, annotation } });
      return annotation;
    },
    [dispatch]
  );

  const addRelatedCard = useCallback(
    (excerptId: string, relatedCardId: string) => {
      dispatch({ type: 'ADD_RELATED_CARD', payload: { excerptId, relatedCardId } });
    },
    [dispatch]
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
    },
    [dispatch]
  );

  const setSelectedTag = useCallback(
    (tagId: string | null) => {
      dispatch({ type: 'SET_SELECTED_TAG', payload: tagId });
    },
    [dispatch]
  );

  const setExpandedCard = useCallback(
    (cardId: string | null) => {
      dispatch({ type: 'SET_EXPANDED_CARD', payload: cardId });
    },
    [dispatch]
  );

  const getExcerptById = useCallback(
    (id: string): Excerpt | undefined => {
      return state.excerpts.find(e => e.id === id);
    },
    [state.excerpts]
  );

  const allTags = useMemo(() => {
    const tagMap = new Map<string, Tag>();
    state.excerpts.forEach(excerpt => {
      excerpt.tags.forEach(tag => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [state.excerpts]);

  return {
    excerpts: state.excerpts,
    filteredExcerpts,
    allTags,
    debouncedQuery,
    addExcerpt,
    deleteExcerpt,
    updateExcerpt,
    addTag,
    removeTag,
    addAnnotation,
    addRelatedCard,
    setSearchQuery,
    setSelectedTag,
    setExpandedCard,
    getExcerptById,
    expandedCardId: state.expandedCardId,
    searchQuery: state.searchQuery,
    selectedTagId: state.selectedTagId,
  };
}
