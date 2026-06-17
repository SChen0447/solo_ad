import math
from typing import Dict, List, Any, Optional

try:
    from rdkit import Chem
    from rdkit.Chem import AllChem
    RDKIT_AVAILABLE = True
except ImportError:
    RDKIT_AVAILABLE = False

PRESET_COORDS = {
    'CCO': {
        'name': '乙醇',
        'formula': 'C2H6O',
        'atoms': [
            {'id': 0, 'element': 'C', 'x': -0.750, 'y': 0.000, 'z': 0.000},
            {'id': 1, 'element': 'C', 'x': 0.750, 'y': 0.000, 'z': 0.000},
            {'id': 2, 'element': 'O', 'x': 1.450, 'y': 1.100, 'z': 0.000},
            {'id': 3, 'element': 'H', 'x': -1.150, 'y': 0.550, 'z': 0.900},
            {'id': 4, 'element': 'H', 'x': -1.150, 'y': 0.550, 'z': -0.900},
            {'id': 5, 'element': 'H', 'x': -1.150, 'y': -1.000, 'z': 0.000},
            {'id': 6, 'element': 'H', 'x': 1.150, 'y': -0.550, 'z': 0.900},
            {'id': 7, 'element': 'H', 'x': 1.150, 'y': -0.550, 'z': -0.900},
            {'id': 8, 'element': 'H', 'x': 2.350, 'y': 1.000, 'z': 0.000}
        ],
        'bonds': [
            {'id': 0, 'atom1': 0, 'atom2': 1, 'type': 'single', 'length': 1.52},
            {'id': 1, 'atom1': 1, 'atom2': 2, 'type': 'single', 'length': 1.43},
            {'id': 2, 'atom1': 0, 'atom2': 3, 'type': 'single', 'length': 1.09},
            {'id': 3, 'atom1': 0, 'atom2': 4, 'type': 'single', 'length': 1.09},
            {'id': 4, 'atom1': 0, 'atom2': 5, 'type': 'single', 'length': 1.09},
            {'id': 5, 'atom1': 1, 'atom2': 6, 'type': 'single', 'length': 1.09},
            {'id': 6, 'atom1': 1, 'atom2': 7, 'type': 'single', 'length': 1.09},
            {'id': 7, 'atom1': 2, 'atom2': 8, 'type': 'single', 'length': 0.96}
        ],
        'molecularWeight': 46.07
    },
    'c1ccccc1': {
        'name': '苯环',
        'formula': 'C6H6',
        'atoms': [
            {'id': 0, 'element': 'C', 'x': 1.390, 'y': 0.000, 'z': 0.000},
            {'id': 1, 'element': 'C', 'x': 0.695, 'y': 1.200, 'z': 0.000},
            {'id': 2, 'element': 'C', 'x': -0.695, 'y': 1.200, 'z': 0.000},
            {'id': 3, 'element': 'C', 'x': -1.390, 'y': 0.000, 'z': 0.000},
            {'id': 4, 'element': 'C', 'x': -0.695, 'y': -1.200, 'z': 0.000},
            {'id': 5, 'element': 'C', 'x': 0.695, 'y': -1.200, 'z': 0.000},
            {'id': 6, 'element': 'H', 'x': 2.470, 'y': 0.000, 'z': 0.000},
            {'id': 7, 'element': 'H', 'x': 1.235, 'y': 2.130, 'z': 0.000},
            {'id': 8, 'element': 'H', 'x': -1.235, 'y': 2.130, 'z': 0.000},
            {'id': 9, 'element': 'H', 'x': -2.470, 'y': 0.000, 'z': 0.000},
            {'id': 10, 'element': 'H', 'x': -1.235, 'y': -2.130, 'z': 0.000},
            {'id': 11, 'element': 'H', 'x': 1.235, 'y': -2.130, 'z': 0.000}
        ],
        'bonds': [
            {'id': 0, 'atom1': 0, 'atom2': 1, 'type': 'aromatic', 'length': 1.39},
            {'id': 1, 'atom1': 1, 'atom2': 2, 'type': 'aromatic', 'length': 1.39},
            {'id': 2, 'atom1': 2, 'atom2': 3, 'type': 'aromatic', 'length': 1.39},
            {'id': 3, 'atom1': 3, 'atom2': 4, 'type': 'aromatic', 'length': 1.39},
            {'id': 4, 'atom1': 4, 'atom2': 5, 'type': 'aromatic', 'length': 1.39},
            {'id': 5, 'atom1': 5, 'atom2': 0, 'type': 'aromatic', 'length': 1.39},
            {'id': 6, 'atom1': 0, 'atom2': 6, 'type': 'single', 'length': 1.08},
            {'id': 7, 'atom1': 1, 'atom2': 7, 'type': 'single', 'length': 1.08},
            {'id': 8, 'atom1': 2, 'atom2': 8, 'type': 'single', 'length': 1.08},
            {'id': 9, 'atom1': 3, 'atom2': 9, 'type': 'single', 'length': 1.08},
            {'id': 10, 'atom1': 4, 'atom2': 10, 'type': 'single', 'length': 1.08},
            {'id': 11, 'atom1': 5, 'atom2': 11, 'type': 'single', 'length': 1.08}
        ],
        'molecularWeight': 78.11
    },
    'CN1C=NC2=C1C(=O)N(C(=O)N2C)C': {
        'name': '咖啡因',
        'formula': 'C8H10N4O2',
        'atoms': [
            {'id': 0, 'element': 'N', 'x': 0.000, 'y': 1.450, 'z': 0.000},
            {'id': 1, 'element': 'C', 'x': 0.000, 'y': 0.000, 'z': 0.000},
            {'id': 2, 'element': 'N', 'x': 1.250, 'y': -0.650, 'z': 0.000},
            {'id': 3, 'element': 'C', 'x': 2.450, 'y': 0.000, 'z': 0.000},
            {'id': 4, 'element': 'N', 'x': 2.450, 'y': 1.400, 'z': 0.000},
            {'id': 5, 'element': 'C', 'x': 1.200, 'y': 2.100, 'z': 0.000},
            {'id': 6, 'element': 'C', 'x': 1.200, 'y': 3.500, 'z': 0.000},
            {'id': 7, 'element': 'O', 'x': 2.300, 'y': 4.100, 'z': 0.000},
            {'id': 8, 'element': 'N', 'x': -0.050, 'y': 4.000, 'z': 0.000},
            {'id': 9, 'element': 'C', 'x': -0.950, 'y': 2.900, 'z': 0.000},
            {'id': 10, 'element': 'C', 'x': -2.400, 'y': 2.800, 'z': 0.000},
            {'id': 11, 'element': 'O', 'x': -3.100, 'y': 3.600, 'z': 0.000},
            {'id': 12, 'element': 'N', 'x': -2.800, 'y': 1.550, 'z': 0.000},
            {'id': 13, 'element': 'C', 'x': -1.750, 'y': 0.700, 'z': 0.000},
            {'id': 14, 'element': 'C', 'x': -1.200, 'y': -0.750, 'z': 0.000},
            {'id': 15, 'element': 'C', 'x': 3.850, 'y': 2.000, 'z': 0.000},
            {'id': 16, 'element': 'C', 'x': -4.250, 'y': 1.150, 'z': 0.000},
            {'id': 17, 'element': 'C', 'x': 3.500, 'y': -0.750, 'z': 0.000},
            {'id': 18, 'element': 'H', 'x': -0.900, 'y': -1.200, 'z': 0.900},
            {'id': 19, 'element': 'H', 'x': -0.900, 'y': -1.200, 'z': -0.900},
            {'id': 20, 'element': 'H', 'x': 4.100, 'y': 2.500, 'z': 0.900},
            {'id': 21, 'element': 'H', 'x': 4.100, 'y': 2.500, 'z': -0.900},
            {'id': 22, 'element': 'H', 'x': 3.800, 'y': 1.100, 'z': 0.000},
            {'id': 23, 'element': 'H', 'x': -4.600, 'y': 0.600, 'z': 0.900},
            {'id': 24, 'element': 'H', 'x': -4.600, 'y': 0.600, 'z': -0.900},
            {'id': 25, 'element': 'H', 'x': -4.800, 'y': 2.000, 'z': 0.000},
            {'id': 26, 'element': 'H', 'x': 3.850, 'y': -1.250, 'z': 0.900},
            {'id': 27, 'element': 'H', 'x': 3.850, 'y': -1.250, 'z': -0.900},
            {'id': 28, 'element': 'H', 'x': 3.900, 'y': 0.100, 'z': 0.000}
        ],
        'bonds': [
            {'id': 0, 'atom1': 0, 'atom2': 1, 'type': 'single', 'length': 1.45},
            {'id': 1, 'atom1': 1, 'atom2': 2, 'type': 'double', 'length': 1.30},
            {'id': 2, 'atom1': 2, 'atom2': 3, 'type': 'single', 'length': 1.40},
            {'id': 3, 'atom1': 3, 'atom2': 4, 'type': 'single', 'length': 1.40},
            {'id': 4, 'atom1': 4, 'atom2': 5, 'type': 'single', 'length': 1.38},
            {'id': 5, 'atom1': 5, 'atom2': 0, 'type': 'single', 'length': 1.38},
            {'id': 6, 'atom1': 5, 'atom2': 6, 'type': 'single', 'length': 1.50},
            {'id': 7, 'atom1': 6, 'atom2': 7, 'type': 'double', 'length': 1.23},
            {'id': 8, 'atom1': 6, 'atom2': 8, 'type': 'single', 'length': 1.41},
            {'id': 9, 'atom1': 8, 'atom2': 9, 'type': 'single', 'length': 1.39},
            {'id': 10, 'atom1': 9, 'atom2': 10, 'type': 'single', 'length': 1.50},
            {'id': 11, 'atom1': 10, 'atom2': 11, 'type': 'double', 'length': 1.23},
            {'id': 12, 'atom1': 10, 'atom2': 12, 'type': 'single', 'length': 1.41},
            {'id': 13, 'atom1': 12, 'atom2': 13, 'type': 'single', 'length': 1.39},
            {'id': 14, 'atom1': 13, 'atom2': 1, 'type': 'single', 'length': 1.50},
            {'id': 15, 'atom1': 13, 'atom2': 14, 'type': 'single', 'length': 1.47},
            {'id': 16, 'atom1': 4, 'atom2': 15, 'type': 'single', 'length': 1.47},
            {'id': 17, 'atom1': 12, 'atom2': 16, 'type': 'single', 'length': 1.47},
            {'id': 18, 'atom1': 3, 'atom2': 17, 'type': 'single', 'length': 1.47},
            {'id': 19, 'atom1': 14, 'atom2': 18, 'type': 'single', 'length': 1.09},
            {'id': 20, 'atom1': 14, 'atom2': 19, 'type': 'single', 'length': 1.09},
            {'id': 21, 'atom1': 15, 'atom2': 20, 'type': 'single', 'length': 1.09},
            {'id': 22, 'atom1': 15, 'atom2': 21, 'type': 'single', 'length': 1.09},
            {'id': 23, 'atom1': 15, 'atom2': 22, 'type': 'single', 'length': 1.09},
            {'id': 24, 'atom1': 16, 'atom2': 23, 'type': 'single', 'length': 1.09},
            {'id': 25, 'atom1': 16, 'atom2': 24, 'type': 'single', 'length': 1.09},
            {'id': 26, 'atom1': 16, 'atom2': 25, 'type': 'single', 'length': 1.09},
            {'id': 27, 'atom1': 17, 'atom2': 26, 'type': 'single', 'length': 1.09},
            {'id': 28, 'atom1': 17, 'atom2': 27, 'type': 'single', 'length': 1.09},
            {'id': 29, 'atom1': 17, 'atom2': 28, 'type': 'single', 'length': 1.09}
        ],
        'molecularWeight': 194.19
    },
    'C(C1C(C(C(C(O1)O)O)O)O)O': {
        'name': '葡萄糖',
        'formula': 'C6H12O6',
        'atoms': [
            {'id': 0, 'element': 'C', 'x': 0.000, 'y': 0.000, 'z': 0.000},
            {'id': 1, 'element': 'C', 'x': 1.520, 'y': 0.000, 'z': 0.000},
            {'id': 2, 'element': 'C', 'x': 2.250, 'y': 1.300, 'z': 0.000},
            {'id': 3, 'element': 'C', 'x': 1.500, 'y': 2.550, 'z': 0.000},
            {'id': 4, 'element': 'C', 'x': 0.000, 'y': 2.550, 'z': 0.000},
            {'id': 5, 'element': 'O', 'x': -0.700, 'y': 1.300, 'z': 0.000},
            {'id': 6, 'element': 'C', 'x': -0.750, 'y': -1.300, 'z': 0.000},
            {'id': 7, 'element': 'O', 'x': -0.500, 'y': 0.650, 'z': 1.150},
            {'id': 8, 'element': 'O', 'x': 2.050, 'y': -0.850, 'z': 0.000},
            {'id': 9, 'element': 'O', 'x': 3.700, 'y': 1.300, 'z': 0.000},
            {'id': 10, 'element': 'O', 'x': 2.200, 'y': 3.800, 'z': 0.000},
            {'id': 11, 'element': 'O', 'x': -0.700, 'y': 3.800, 'z': 0.000},
            {'id': 12, 'element': 'O', 'x': -2.200, 'y': -1.300, 'z': 0.000},
            {'id': 13, 'element': 'H', 'x': -0.100, 'y': 0.600, 'z': -0.900},
            {'id': 14, 'element': 'H', 'x': 1.620, 'y': -0.600, 'z': -0.900},
            {'id': 15, 'element': 'H', 'x': 2.150, 'y': 1.900, 'z': -0.900},
            {'id': 16, 'element': 'H', 'x': 1.400, 'y': 3.150, 'z': -0.900},
            {'id': 17, 'element': 'H', 'x': 0.100, 'y': 3.150, 'z': -0.900},
            {'id': 18, 'element': 'H', 'x': -0.250, 'y': -1.900, 'z': -0.900},
            {'id': 19, 'element': 'H', 'x': 1.000, 'y': 0.600, 'z': 1.150},
            {'id': 20, 'element': 'H', 'x': 1.550, 'y': -0.850, 'z': 0.000},
            {'id': 21, 'element': 'H', 'x': 4.100, 'y': 1.700, 'z': 0.000},
            {'id': 22, 'element': 'H', 'x': 2.500, 'y': 4.500, 'z': 0.000},
            {'id': 23, 'element': 'H', 'x': -1.000, 'y': 4.500, 'z': 0.000},
            {'id': 24, 'element': 'H', 'x': -2.600, 'y': -1.700, 'z': 0.000}
        ],
        'bonds': [
            {'id': 0, 'atom1': 0, 'atom2': 1, 'type': 'single', 'length': 1.52},
            {'id': 1, 'atom1': 1, 'atom2': 2, 'type': 'single', 'length': 1.52},
            {'id': 2, 'atom1': 2, 'atom2': 3, 'type': 'single', 'length': 1.52},
            {'id': 3, 'atom1': 3, 'atom2': 4, 'type': 'single', 'length': 1.52},
            {'id': 4, 'atom1': 4, 'atom2': 5, 'type': 'single', 'length': 1.43},
            {'id': 5, 'atom1': 5, 'atom2': 0, 'type': 'single', 'length': 1.43},
            {'id': 6, 'atom1': 0, 'atom2': 6, 'type': 'single', 'length': 1.52},
            {'id': 7, 'atom1': 0, 'atom2': 7, 'type': 'single', 'length': 1.41},
            {'id': 8, 'atom1': 1, 'atom2': 8, 'type': 'single', 'length': 1.41},
            {'id': 9, 'atom1': 2, 'atom2': 9, 'type': 'single', 'length': 1.41},
            {'id': 10, 'atom1': 3, 'atom2': 10, 'type': 'single', 'length': 1.41},
            {'id': 11, 'atom1': 4, 'atom2': 11, 'type': 'single', 'length': 1.41},
            {'id': 12, 'atom1': 6, 'atom2': 12, 'type': 'single', 'length': 1.41},
            {'id': 13, 'atom1': 0, 'atom2': 13, 'type': 'single', 'length': 1.09},
            {'id': 14, 'atom1': 1, 'atom2': 14, 'type': 'single', 'length': 1.09},
            {'id': 15, 'atom1': 2, 'atom2': 15, 'type': 'single', 'length': 1.09},
            {'id': 16, 'atom1': 3, 'atom2': 16, 'type': 'single', 'length': 1.09},
            {'id': 17, 'atom1': 4, 'atom2': 17, 'type': 'single', 'length': 1.09},
            {'id': 18, 'atom1': 6, 'atom2': 18, 'type': 'single', 'length': 1.09},
            {'id': 19, 'atom1': 7, 'atom2': 19, 'type': 'single', 'length': 0.96},
            {'id': 20, 'atom1': 8, 'atom2': 20, 'type': 'single', 'length': 0.96},
            {'id': 21, 'atom1': 9, 'atom2': 21, 'type': 'single', 'length': 0.96},
            {'id': 22, 'atom1': 10, 'atom2': 22, 'type': 'single', 'length': 0.96},
            {'id': 23, 'atom1': 11, 'atom2': 23, 'type': 'single', 'length': 0.96},
            {'id': 24, 'atom1': 12, 'atom2': 24, 'type': 'single', 'length': 0.96}
        ],
        'molecularWeight': 180.16
    },
    'NCC(=O)NCC(=O)O': {
        'name': '短肽',
        'formula': 'C4H8N2O3',
        'atoms': [
            {'id': 0, 'element': 'N', 'x': -2.500, 'y': 0.000, 'z': 0.000},
            {'id': 1, 'element': 'C', 'x': -1.200, 'y': 0.000, 'z': 0.000},
            {'id': 2, 'element': 'C', 'x': -0.450, 'y': 1.250, 'z': 0.000},
            {'id': 3, 'element': 'O', 'x': 0.750, 'y': 1.250, 'z': 0.000},
            {'id': 4, 'element': 'N', 'x': -1.150, 'y': 2.400, 'z': 0.000},
            {'id': 5, 'element': 'C', 'x': -0.450, 'y': 3.600, 'z': 0.000},
            {'id': 6, 'element': 'C', 'x': 0.300, 'y': 4.850, 'z': 0.000},
            {'id': 7, 'element': 'O', 'x': 1.500, 'y': 4.850, 'z': 0.000},
            {'id': 8, 'element': 'O', 'x': -0.350, 'y': 6.000, 'z': 0.000},
            {'id': 9, 'element': 'H', 'x': -3.000, 'y': 0.900, 'z': 0.000},
            {'id': 10, 'element': 'H', 'x': -3.000, 'y': -0.900, 'z': 0.000},
            {'id': 11, 'element': 'H', 'x': -0.700, 'y': -0.550, 'z': 0.900},
            {'id': 12, 'element': 'H', 'x': -0.700, 'y': -0.550, 'z': -0.900},
            {'id': 13, 'element': 'H', 'x': -1.850, 'y': 2.400, 'z': 0.000},
            {'id': 14, 'element': 'H', 'x': 0.050, 'y': 3.050, 'z': 0.900},
            {'id': 15, 'element': 'H', 'x': 0.050, 'y': 3.050, 'z': -0.900},
            {'id': 16, 'element': 'H', 'x': -0.850, 'y': 6.500, 'z': 0.000}
        ],
        'bonds': [
            {'id': 0, 'atom1': 0, 'atom2': 1, 'type': 'single', 'length': 1.47},
            {'id': 1, 'atom1': 1, 'atom2': 2, 'type': 'single', 'length': 1.52},
            {'id': 2, 'atom1': 2, 'atom2': 3, 'type': 'double', 'length': 1.23},
            {'id': 3, 'atom1': 2, 'atom2': 4, 'type': 'single', 'length': 1.34},
            {'id': 4, 'atom1': 4, 'atom2': 5, 'type': 'single', 'length': 1.47},
            {'id': 5, 'atom1': 5, 'atom2': 6, 'type': 'single', 'length': 1.52},
            {'id': 6, 'atom1': 6, 'atom2': 7, 'type': 'double', 'length': 1.23},
            {'id': 7, 'atom1': 6, 'atom2': 8, 'type': 'single', 'length': 1.30},
            {'id': 8, 'atom1': 0, 'atom2': 9, 'type': 'single', 'length': 1.01},
            {'id': 9, 'atom1': 0, 'atom2': 10, 'type': 'single', 'length': 1.01},
            {'id': 10, 'atom1': 1, 'atom2': 11, 'type': 'single', 'length': 1.09},
            {'id': 11, 'atom1': 1, 'atom2': 12, 'type': 'single', 'length': 1.09},
            {'id': 12, 'atom1': 4, 'atom2': 13, 'type': 'single', 'length': 1.01},
            {'id': 13, 'atom1': 5, 'atom2': 14, 'type': 'single', 'length': 1.09},
            {'id': 14, 'atom1': 5, 'atom2': 15, 'type': 'single', 'length': 1.09},
            {'id': 15, 'atom1': 8, 'atom2': 16, 'type': 'single', 'length': 0.96}
        ],
        'molecularWeight': 132.12
    }
}

ATOMIC_WEIGHTS = {
    'H': 1.008, 'C': 12.011, 'N': 14.007, 'O': 15.999,
    'F': 18.998, 'P': 30.974, 'S': 32.065, 'Cl': 35.453,
    'Br': 79.904, 'I': 126.904, 'B': 10.811, 'Li': 6.941,
    'Na': 22.990, 'K': 39.098, 'Ca': 40.078, 'Fe': 55.845,
    'Zn': 65.380, 'Cu': 63.546, 'Mg': 24.305, 'Al': 26.982
}

def get_bond_type(bond) -> str:
    if RDKIT_AVAILABLE:
        bt = bond.GetBondType()
        if bt == Chem.BondType.SINGLE:
            return 'single'
        elif bt == Chem.BondType.DOUBLE:
            return 'double'
        elif bt == Chem.BondType.TRIPLE:
            return 'triple'
        elif bt == Chem.BondType.AROMATIC:
            return 'aromatic'
    return 'single'

def calculate_distance(p1, p2) -> float:
    return math.sqrt(
        (p1[0] - p2[0])**2 +
        (p1[1] - p2[1])**2 +
        (p1[2] - p2[2])**2
    )

def parse_smiles(smiles: str) -> Optional[Dict[str, Any]]:
    canonical_smiles = smiles.strip()
    
    if canonical_smiles in PRESET_COORDS:
        return PRESET_COORDS[canonical_smiles]
    
    if RDKIT_AVAILABLE:
        try:
            mol = Chem.MolFromSmiles(canonical_smiles)
            if mol is None:
                return None
            
            mol = Chem.AddHs(mol)
            params = AllChem.ETKDGv3()
            params.randomSeed = 42
            result = AllChem.EmbedMolecule(mol, params)
            
            if result != 0:
                result = AllChem.EmbedMolecule(mol, AllChem.ETKDG())
            
            if result != 0:
                return None
            
            try:
                AllChem.UFFOptimizeMolecule(mol)
            except:
                pass
            
            conf = mol.GetConformer()
            atoms = []
            for i, atom in enumerate(mol.GetAtoms()):
                pos = conf.GetAtomPosition(i)
                atoms.append({
                    'id': i,
                    'element': atom.GetSymbol(),
                    'x': float(pos.x),
                    'y': float(pos.y),
                    'z': float(pos.z)
                })
            
            bonds = []
            for bond in mol.GetBonds():
                atom1_idx = bond.GetBeginAtomIdx()
                atom2_idx = bond.GetEndAtomIdx()
                p1 = conf.GetAtomPosition(atom1_idx)
                p2 = conf.GetAtomPosition(atom2_idx)
                bonds.append({
                    'id': bond.GetIdx(),
                    'atom1': atom1_idx,
                    'atom2': atom2_idx,
                    'type': get_bond_type(bond),
                    'length': calculate_distance([p1.x, p1.y, p1.z], [p2.x, p2.y, p2.z])
                })
            
            formula = Chem.rdMolDescriptors.CalcMolFormula(mol)
            mol_weight = Chem.rdMolDescriptors.CalcExactMolWt(mol)
            
            try:
                name = Chem.MolToInchiKey(mol)[:10]
            except:
                name = 'Unknown'
            
            return {
                'name': name,
                'formula': formula,
                'molecularWeight': round(mol_weight, 2),
                'atoms': atoms,
                'bonds': bonds
            }
            
        except Exception as e:
            print(f"RDKit parsing error: {e}")
            return None
    
    return None

def get_molecule_name(smiles: str) -> str:
    names = {
        'CCO': '乙醇',
        'c1ccccc1': '苯环',
        'CN1C=NC2=C1C(=O)N(C(=O)N2C)C': '咖啡因',
        'C(C1C(C(C(C(O1)O)O)O)O)O': '葡萄糖',
        'NCC(=O)NCC(=O)O': '短肽'
    }
    return names.get(smiles, '未知分子')

def get_preset_molecules() -> List[Dict[str, str]]:
    return [
        {'id': 'ethanol', 'name': '乙醇', 'smiles': 'CCO'},
        {'id': 'benzene', 'name': '苯环', 'smiles': 'c1ccccc1'},
        {'id': 'caffeine', 'name': '咖啡因', 'smiles': 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C'},
        {'id': 'glucose', 'name': '葡萄糖', 'smiles': 'C(C1C(C(C(C(O1)O)O)O)O)O'},
        {'id': 'peptide', 'name': '短肽', 'smiles': 'NCC(=O)NCC(=O)O'}
    ]
