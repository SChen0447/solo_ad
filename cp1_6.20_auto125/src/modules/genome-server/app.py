from flask import Flask, jsonify
from flask_cors import CORS
import numpy as np
import random
import math

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

GENE_CATEGORIES = ['transcription_factor', 'structural_protein', 'non_coding_rna']

GENE_NAMES = [
    'BRCA1', 'TP53', 'EGFR', 'MYC', 'KRAS', 'PTEN', 'CDKN2A', 'APC', 'RB1', 'BRCA2',
    'PIK3CA', 'NRAS', 'BRAF', 'MET', 'ALK', 'ROS1', 'HER2', 'VEGFA', 'PDGFRA', 'KIT',
    'FLT3', 'IDH1', 'IDH2', 'DNMT3A', 'TET2', 'RUNX1', 'NPM1', 'CEBPA', 'WT1', 'ASXL1',
    'EZH2', 'SF3B1', 'U2AF1', 'SRSF2', 'ZRSR2', 'TPMT', 'CYP2D6', 'CYP2C19', 'HLA-B', 'HLA-A'
]

DISEASES_POOL = [
    '乳腺癌', '肺癌', '结直肠癌', '前列腺癌', '胰腺癌',
    '白血病', '淋巴瘤', '黑色素瘤', '卵巢癌', '胃癌',
    '肝癌', '神经胶质瘤', '骨肉瘤', '肾癌', '甲状腺癌'
]

DESCRIPTIONS = {
    'transcription_factor': '该基因编码转录因子蛋白，通过结合特定DNA序列调控下游基因的转录表达，在细胞周期调控、细胞分化和发育过程中发挥关键作用。其异常表达或突变常导致细胞增殖失控，与多种恶性肿瘤的发生发展密切相关。',
    'structural_protein': '该基因编码结构蛋白，参与细胞骨架组成、核基质构建及染色质高级结构维持。作为细胞内重要的机械支撑成分，它确保染色体正确分离和细胞核形态稳定，其功能异常可导致基因组不稳定和遗传性疾病。',
    'non_coding_rna': '该基因转录产生非编码RNA分子，不翻译为蛋白质但具有重要调控功能。可通过表观遗传修饰、转录后调控或信号通路参与等方式，在基因表达网络中充当关键调节因子，其表达异常与肿瘤、神经退行性疾病等密切相关。'
}


def generate_chromosome_skeleton():
    points = []
    for i in range(60):
        t = i / 59.0
        if i < 30:
            arm_t = i / 29.0
            angle = arm_t * math.pi * 1.5
            radius = 0.5 + arm_t * 1.5
            x = math.cos(angle) * radius
            y = -3.0 + arm_t * 3.0
            z = math.sin(angle) * radius * 0.6
        else:
            arm_t = (i - 30) / 29.0
            angle = arm_t * math.pi * 1.5 + math.pi
            radius = 0.5 + arm_t * 1.5
            x = math.cos(angle) * radius
            y = -3.0 + arm_t * 3.0
            z = math.sin(angle) * radius * 0.6
        points.append({'x': float(x), 'y': float(y), 'z': float(z)})
    return points


def generate_genes(skeleton_points):
    genes = []
    used_indices = set()
    for i in range(35):
        while True:
            point_idx = random.randint(0, 59)
            if point_idx not in used_indices:
                used_indices.add(point_idx)
                break

        point = skeleton_points[point_idx]
        category = random.choice(GENE_CATEGORIES)
        gene_name = GENE_NAMES[i % len(GENE_NAMES)]

        offset = 0.35
        angle_x = random.uniform(0, 2 * math.pi)
        angle_y = random.uniform(0, 2 * math.pi)
        offset_x = math.cos(angle_x) * math.sin(angle_y) * offset
        offset_y = math.sin(angle_x) * math.sin(angle_y) * offset
        offset_z = math.cos(angle_y) * offset

        num_diseases = random.randint(1, 4)
        diseases = random.sample(DISEASES_POOL, num_diseases)

        gene = {
            'id': f'GENE{i + 1:03d}',
            'name': gene_name,
            'category': category,
            'position': {
                'x': float(point['x'] + offset_x),
                'y': float(point['y'] + offset_y),
                'z': float(point['z'] + offset_z)
            },
            'skeleton_index': point_idx,
            'description': DESCRIPTIONS[category],
            'diseases': diseases
        }
        genes.append(gene)
    return genes


@app.route('/api/structure', methods=['GET'])
def get_structure():
    skeleton = generate_chromosome_skeleton()
    genes = generate_genes(skeleton)
    return jsonify({
        'skeleton_points': skeleton,
        'genes': genes
    })


@app.route('/api/gene/<gene_id>', methods=['GET'])
def get_gene_detail(gene_id):
    skeleton = generate_chromosome_skeleton()
    all_genes = generate_genes(skeleton)

    gene = next((g for g in all_genes if g['id'] == gene_id), None)
    if gene is None:
        return jsonify({'error': 'Gene not found'}), 404

    gene_copy = dict(gene)
    gene_copy['description'] = (
        f"{gene_copy['description']} "
        f"该基因位于染色体骨架第{gene_copy['skeleton_index']}号节点附近。"
        f"研究表明，{gene_copy['name']}在正常生理条件下参与细胞的基本生命活动，"
        f"而在病理状态下，其表达水平或蛋白功能的改变可导致信号通路异常激活或抑制。"
        f"临床上，针对{gene_copy['name']}的靶向治疗方案正在多项临床试验中进行评估，"
        f"有望为相关疾病患者提供新的治疗策略。"
    )
    gene_copy['chromosome_band'] = f'{random.randint(1, 22)}q{random.randint(10, 36)}.{random.randint(1, 9)}'
    gene_copy['expression_level'] = random.choice(['高表达', '中表达', '低表达'])
    gene_copy['conservation_score'] = round(random.uniform(0.7, 0.99), 3)

    return jsonify(gene_copy)


if __name__ == '__main__':
    random.seed(42)
    app.run(host='0.0.0.0', port=5000, debug=True)
