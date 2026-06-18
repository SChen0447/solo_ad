import { v4 as uuidv4 } from 'uuid';

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: number;
}

export type AnnotationType = 'circle' | 'arrow';

export interface Annotation {
  id: string;
  type: AnnotationType;
  x: number;
  y: number;
  radius?: number;
  endX?: number;
  endY?: number;
  comments: Comment[];
  createdAt: number;
}

export interface Design {
  id: string;
  name: string;
  imageUrl: string;
  imageData: string;
  annotations: Annotation[];
  createdAt: number;
}

const designs = new Map<string, Design>();

export function addDesign(name: string, imageData: string): Design {
  const id = uuidv4();
  const design: Design = {
    id,
    name,
    imageUrl: id,
    imageData,
    annotations: [],
    createdAt: Date.now()
  };
  designs.set(id, design);
  return design;
}

export function getDesign(id: string): Design | undefined {
  return designs.get(id);
}

export function getAllDesigns(): Omit<Design, 'imageData' | 'annotations'>[] {
  return Array.from(designs.values()).map(({ id, name, imageUrl, createdAt, annotations }) => ({
    id,
    name,
    imageUrl,
    createdAt,
    commentCount: annotations.reduce((sum, a) => sum + a.comments.length, 0)
  }));
}

export function addAnnotation(designId: string, annotation: Omit<Annotation, 'id' | 'comments' | 'createdAt'>): Annotation | null {
  const design = designs.get(designId);
  if (!design) return null;
  
  const newAnnotation: Annotation = {
    ...annotation,
    id: uuidv4(),
    comments: [],
    createdAt: Date.now()
  };
  design.annotations.push(newAnnotation);
  return newAnnotation;
}

export function updateAnnotation(designId: string, annotationId: string, updates: Partial<Annotation>): Annotation | null {
  const design = designs.get(designId);
  if (!design) return null;
  
  const annotation = design.annotations.find(a => a.id === annotationId);
  if (!annotation) return null;
  
  Object.assign(annotation, updates);
  return annotation;
}

export function deleteAnnotation(designId: string, annotationId: string): boolean {
  const design = designs.get(designId);
  if (!design) return false;
  
  const index = design.annotations.findIndex(a => a.id === annotationId);
  if (index === -1) return false;
  
  design.annotations.splice(index, 1);
  return true;
}

export function addComment(designId: string, annotationId: string, author: string, content: string): Comment | null {
  const design = designs.get(designId);
  if (!design) return null;
  
  const annotation = design.annotations.find(a => a.id === annotationId);
  if (!annotation) return null;
  
  const comment: Comment = {
    id: uuidv4(),
    author,
    content,
    timestamp: Date.now()
  };
  annotation.comments.push(comment);
  return comment;
}

export function exportData(): Record<string, Design> {
  const result: Record<string, Design> = {};
  designs.forEach((design, id) => {
    result[id] = design;
  });
  return result;
}

export function importData(data: Record<string, Design>): number {
  let count = 0;
  Object.values(data).forEach(design => {
    designs.set(design.id, design);
    count++;
  });
  return count;
}
