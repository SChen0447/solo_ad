import type { Atom, Bond, ElementProperty, Residue } from '@/types';

export const ELEMENT_PROPERTIES: Record<string, ElementProperty> = {
  H: { symbol: 'H', name: '氢', atomicNumber: 1, mass: 1.008, vanDerWaalsRadius: 1.2, cpkColor: '#ffffff' },
  C: { symbol: 'C', name: '碳', atomicNumber: 6, mass: 12.011, vanDerWaalsRadius: 1.7, cpkColor: '#808080' },
  N: { symbol: 'N', name: '氮', atomicNumber: 7, mass: 14.007, vanDerWaalsRadius: 1.55, cpkColor: '#0000ff' },
  O: { symbol: 'O', name: '氧', atomicNumber: 8, mass: 15.999, vanDerWaalsRadius: 1.52, cpkColor: '#ff0000' },
  F: { symbol: 'F', name: '氟', atomicNumber: 9, mass: 18.998, vanDerWaalsRadius: 1.47, cpkColor: '#00ff00' },
  P: { symbol: 'P', name: '磷', atomicNumber: 15, mass: 30.974, vanDerWaalsRadius: 1.8, cpkColor: '#ffa500' },
  S: { symbol: 'S', name: '硫', atomicNumber: 16, mass: 32.06, vanDerWaalsRadius: 1.8, cpkColor: '#ffff00' },
  Cl: { symbol: 'Cl', name: '氯', atomicNumber: 17, mass: 35.45, vanDerWaalsRadius: 1.75, cpkColor: '#00ff00' },
};

export const SECONDARY_STRUCTURE_COLORS: Record<string, string> = {
  helix: '#ff4444',
  sheet: '#ffff44',
  coil: '#44ff44',
};

export const SECONDARY_STRUCTURE_NAMES: Record<string, string> = {
  helix: 'α-螺旋',
  sheet: 'β-折叠',
  coil: '无规卷曲',
};

export function getElementProperty(element: string): ElementProperty {
  return ELEMENT_PROPERTIES[element] || {
    symbol: element,
    name: element,
    atomicNumber: 0,
    mass: 0,
    vanDerWaalsRadius: 1.0,
    cpkColor: '#808080',
  };
}

export function getCPKColor(element: string): string {
  return getElementProperty(element).cpkColor;
}

export function getSecondaryStructureColor(structure: string): string {
  return SECONDARY_STRUCTURE_COLORS[structure] || '#808080';
}

export function calculateDistance(a1: Atom, a2: Atom): number {
  const dx = a2.x - a1.x;
  const dy = a2.y - a1.y;
  const dz = a2.z - a1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function calculateAngle(a1: Atom, a2: Atom, a3: Atom): number {
  const v1x = a1.x - a2.x;
  const v1y = a1.y - a2.y;
  const v1z = a1.z - a2.z;
  
  const v2x = a3.x - a2.x;
  const v2y = a3.y - a2.y;
  const v2z = a3.z - a2.z;
  
  const dotProduct = v1x * v2x + v1y * v2y + v1z * v2z;
  const mag1 = Math.sqrt(v1x * v1x + v1y * v1y + v1z * v1z);
  const mag2 = Math.sqrt(v2x * v2x + v2y * v2y + v2z * v2z);
  
  const cosAngle = dotProduct / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

export function calculateDihedral(a1: Atom, a2: Atom, a3: Atom, a4: Atom): number {
  const b1 = { x: a2.x - a1.x, y: a2.y - a1.y, z: a2.z - a1.z };
  const b2 = { x: a3.x - a2.x, y: a3.y - a2.y, z: a3.z - a2.z };
  const b3 = { x: a4.x - a3.x, y: a4.y - a3.y, z: a4.z - a3.z };
  
  const n1 = crossProduct(b1, b2);
  const n2 = crossProduct(b2, b3);
  
  const normN1 = normalizeVector(n1);
  const normN2 = normalizeVector(n2);
  const normB2 = normalizeVector(b2);
  
  const m1 = crossProduct(normN1, normB2);
  
  const x = dotProduct(normN1, normN2);
  const y = dotProduct(m1, normN2);
  
  return Math.atan2(y, x) * (180 / Math.PI);
}

function crossProduct(v1: { x: number; y: number; z: number }, v2: { x: number; y: number; z: number }) {
  return {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x,
  };
}

function dotProduct(v1: { x: number; y: number; z: number }, v2: { x: number; y: number; z: number }) {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
}

function normalizeVector(v: { x: number; y: number; z: number }) {
  const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
}

export function calculateHydrophobicityIndex(residue: Residue): number {
  return residue.hydrophobicity;
}

export function getResidueFullName(residueName: string): string {
  const names: Record<string, string> = {
    ALA: '丙氨酸 (Alanine)',
    ARG: '精氨酸 (Arginine)',
    ASN: '天冬酰胺 (Asparagine)',
    ASP: '天冬氨酸 (Aspartic acid)',
    CYS: '半胱氨酸 (Cysteine)',
    GLN: '谷氨酰胺 (Glutamine)',
    GLU: '谷氨酸 (Glutamic acid)',
    GLY: '甘氨酸 (Glycine)',
    HIS: '组氨酸 (Histidine)',
    ILE: '异亮氨酸 (Isoleucine)',
    LEU: '亮氨酸 (Leucine)',
    LYS: '赖氨酸 (Lysine)',
    MET: '甲硫氨酸 (Methionine)',
    PHE: '苯丙氨酸 (Phenylalanine)',
    PRO: '脯氨酸 (Proline)',
    SER: '丝氨酸 (Serine)',
    THR: '苏氨酸 (Threonine)',
    TRP: '色氨酸 (Tryptophan)',
    TYR: '酪氨酸 (Tyrosine)',
    VAL: '缬氨酸 (Valine)',
  };
  return names[residueName] || residueName;
}

export function findBondsForAtom(atomId: number, bonds: Bond[]): Bond[] {
  return bonds.filter(b => b.atom1Id === atomId || b.atom2Id === atomId);
}

export function findAdjacentAtoms(atomId: number, bonds: Bond[], atoms: Atom[]): Atom[] {
  const atomBonds = findBondsForAtom(atomId, bonds);
  const adjacentAtomIds = new Set<number>();
  
  atomBonds.forEach(bond => {
    if (bond.atom1Id !== atomId) adjacentAtomIds.add(bond.atom1Id);
    if (bond.atom2Id !== atomId) adjacentAtomIds.add(bond.atom2Id);
  });
  
  return atoms.filter(a => adjacentAtomIds.has(a.id));
}

export function calculateMolecularMass(atoms: Atom[]): number {
  return atoms.reduce((sum, atom) => sum + getElementProperty(atom.element).mass, 0);
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}
