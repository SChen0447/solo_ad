from flask import Flask, request, jsonify
from flask_cors import CORS
import math
import json

app = Flask(__name__)
CORS(app)

BOND_LENGTH = 3.8
CA_RADIUS = 0.6
BACKBONE_RADIUS = 0.2

ALPHA_PHI = -57.0
ALPHA_PSI = -47.0
BETA_PHI = -139.0
BETA_PSI = 135.0

SEQUENCES = [
    {
        "name": "纯α-螺旋（丙氨酸）",
        "residues": ["ALA"] * 15,
        "type": "alpha"
    },
    {
        "name": "β-折叠（缬氨酸-丝氨酸交替）",
        "residues": ["VAL", "SER"] * 8,
        "type": "beta"
    },
    {
        "name": "随机卷曲（甘氨酸-脯氨酸）",
        "residues": ["GLY", "PRO"] * 8,
        "type": "coil"
    }
]

RESIDUE_PROPERTIES = {
    "ALA": {"type": "nonpolar", "sidechain_length": 1.0, "color": [0.9, 0.9, 0.9]},
    "VAL": {"type": "nonpolar", "sidechain_length": 1.3, "color": [0.9, 0.9, 0.9]},
    "SER": {"type": "polar", "sidechain_length": 1.2, "color": [0.2, 0.8, 0.3]},
    "GLY": {"type": "nonpolar", "sidechain_length": 0.5, "color": [0.9, 0.9, 0.9]},
    "PRO": {"type": "nonpolar", "sidechain_length": 1.1, "color": [0.8, 0.6, 0.6]}
}

RESIDUE_COLORS_BY_TYPE = {
    "nonpolar": [1.0, 1.0, 1.0],
    "polar": [0.2, 0.9, 0.3],
    "acidic": [1.0, 0.2, 0.2],
    "basic": [0.2, 0.4, 1.0]
}


def deg2rad(deg):
    return deg * math.pi / 180.0


def rad2deg(rad):
    return rad * 180.0 / math.pi


def rotation_matrix(axis, angle):
    c = math.cos(angle)
    s = math.sin(angle)
    t = 1 - c
    x, y, z = axis
    return [
        [t * x * x + c, t * x * y - s * z, t * x * z + s * y],
        [t * x * y + s * z, t * y * y + c, t * y * z - s * x],
        [t * x * z - s * y, t * y * z + s * x, t * z * z + c]
    ]


def mat_vec_mult(mat, vec):
    return [
        mat[0][0] * vec[0] + mat[0][1] * vec[1] + mat[0][2] * vec[2],
        mat[1][0] * vec[0] + mat[1][1] * vec[1] + mat[1][2] * vec[2],
        mat[2][0] * vec[0] + mat[2][1] * vec[1] + mat[2][2] * vec[2]
    ]


def vec_sub(a, b):
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]


def vec_add(a, b):
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]


def vec_scale(v, s):
    return [v[0] * s, v[1] * s, v[2] * s]


def vec_length(v):
    return math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])


def vec_normalize(v):
    l = vec_length(v)
    if l < 1e-10:
        return [0, 0, 0]
    return [v[0] / l, v[1] / l, v[2] / l]


def vec_cross(a, b):
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0]
    ]


def vec_dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def normalize_angle(deg):
    while deg > 180:
        deg -= 360
    while deg < -180:
        deg += 360
    return deg


def generate_linear_chain(n_residues):
    coords = []
    for i in range(n_residues):
        coords.append([i * BOND_LENGTH, 0, 0])
    return coords


def calculate_dihedral(p0, p1, p2, p3):
    b1 = vec_sub(p1, p0)
    b2 = vec_sub(p2, p1)
    b3 = vec_sub(p3, p2)

    n1 = vec_normalize(vec_cross(b1, b2))
    n2 = vec_normalize(vec_cross(b2, b3))

    m1 = vec_cross(n1, vec_normalize(b2))
    x = vec_dot(n1, n2)
    y = vec_dot(m1, n2)

    angle = -math.atan2(y, x)
    return rad2deg(angle)


def apply_psi_rotation(coords, i, psi_delta):
    if i >= len(coords) - 1:
        return coords

    pivot = coords[i]
    axis = vec_normalize(vec_sub(coords[i], coords[i - 1])) if i > 0 else [1, 0, 0]

    rot_mat = rotation_matrix(axis, deg2rad(psi_delta))
    new_coords = [list(c) for c in coords]

    for j in range(i + 1, len(coords)):
        rel = vec_sub(new_coords[j], pivot)
        rotated = mat_vec_mult(rot_mat, rel)
        new_coords[j] = vec_add(pivot, rotated)

    return new_coords


def apply_phi_rotation(coords, i, phi_delta):
    if i >= len(coords) - 2 or i < 1:
        return coords

    pivot = coords[i]
    next_ca = coords[i + 1]
    axis = vec_normalize(vec_sub(next_ca, pivot))

    rot_mat = rotation_matrix(axis, deg2rad(phi_delta))
    new_coords = [list(c) for c in coords]

    for j in range(i + 2, len(coords)):
        rel = vec_sub(new_coords[j], pivot)
        rotated = mat_vec_mult(rot_mat, rel)
        new_coords[j] = vec_add(pivot, rotated)

    return new_coords


def fold_to_target(coords, target_phis, target_psis, progress):
    n = len(coords)
    result = [list(c) for c in coords]
    linear = generate_linear_chain(n)

    result = [list(c) for c in linear]

    for i in range(1, n - 1):
        t_phi = target_phis[i] * progress
        t_psi = target_psis[i] * progress
        result = apply_phi_rotation(result, i, t_phi)
        result = apply_psi_rotation(result, i, t_psi)

    return result


def generate_target_angles(n_residues, seq_type):
    phis = [0.0] * n_residues
    psis = [0.0] * n_residues

    if seq_type == "alpha":
        for i in range(1, n_residues - 1):
            phis[i] = ALPHA_PHI
            psis[i] = ALPHA_PSI
    elif seq_type == "beta":
        for i in range(1, n_residues - 1):
            phis[i] = BETA_PHI
            psis[i] = BETA_PSI
    else:
        import random
        random.seed(42)
        for i in range(1, n_residues - 1):
            phis[i] = random.uniform(-120, 120)
            psis[i] = random.uniform(-150, 150)

    return phis, psis


def generate_keyframes(seq_idx):
    seq = SEQUENCES[seq_idx]
    n = len(seq["residues"])

    target_phis, target_psis = generate_target_angles(n, seq["type"])
    linear = generate_linear_chain(n)

    progresses = [0.0, 0.25, 0.5, 0.75, 1.0]
    keyframes = []

    for p in progresses:
        coords = fold_to_target(linear, target_phis, target_psis, p)

        phis_at_frame = [0.0] * n
        psis_at_frame = [0.0] * n
        for i in range(1, n - 1):
            phis_at_frame[i] = normalize_angle(target_phis[i] * p)
            psis_at_frame[i] = normalize_angle(target_psis[i] * p)

        sidechains = []
        for i in range(n):
            prop = RESIDUE_PROPERTIES[seq["residues"][i]]
            if i < n - 1:
                bond_dir = vec_normalize(vec_sub(coords[i + 1], coords[i]))
            else:
                bond_dir = vec_normalize(vec_sub(coords[i], coords[i - 1]))
            perp = vec_normalize([-bond_dir[1], bond_dir[0], bond_dir[2] * 0.5])
            if vec_length(perp) < 0.1:
                perp = [0, 0, 1]
            sidechain_end = vec_add(coords[i], vec_scale(perp, prop["sidechain_length"]))
            sidechains.append(sidechain_end)

        keyframe = {
            "progress": p,
            "ca_coords": coords,
            "sidechain_coords": sidechains,
            "phis": phis_at_frame,
            "psis": psis_at_frame
        }
        keyframes.append(keyframe)

    residues_info = []
    for i, r in enumerate(seq["residues"]):
        prop = RESIDUE_PROPERTIES[r]
        residues_info.append({
            "name": r,
            "index": i,
            "type": prop["type"],
            "sidechain_color": RESIDUE_COLORS_BY_TYPE[prop["type"]],
            "backbone_color": None
        })

    return {
        "sequence_name": seq["name"],
        "sequence_type": seq["type"],
        "n_residues": n,
        "residues": residues_info,
        "keyframes": keyframes,
        "target_phis": target_phis,
        "target_psis": target_psis
    }


@app.route('/api/fold', methods=['POST'])
def fold_api():
    try:
        data = request.get_json(force=True)
        seq_idx = int(data.get('sequence_id', 0))
        if seq_idx < 0 or seq_idx >= len(SEQUENCES):
            return jsonify({"error": "Invalid sequence_id"}), 400

        result = generate_keyframes(seq_idx)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/sequences', methods=['GET'])
def get_sequences():
    seqs = []
    for i, s in enumerate(SEQUENCES):
        seqs.append({
            "id": i,
            "name": s["name"],
            "type": s["type"],
            "length": len(s["residues"])
        })
    return jsonify(seqs)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    print("Starting Protein Folding Backend on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=False)
