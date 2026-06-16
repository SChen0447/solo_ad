from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import copy
from dialogue_engine import (
    generate_root_node,
    generate_initial_branches,
    generate_child_suggestion,
    compute_personality_fit,
    determine_avatar_expression,
    compute_layout,
)

app = Flask(__name__)
CORS(app)

npcs = {}


def _tree_to_flat(node, parent_id=None, flat=None):
    if flat is None:
        flat = []
    entry = {
        'id': node['id'],
        'text': node['text'],
        'personalityFit': node['personalityFit'],
        'nodeType': node['nodeType'],
        'parentId': parent_id,
    }
    flat.append(entry)
    for child in node.get('children', []):
        _tree_to_flat(child, node['id'], flat)
    return flat


def _flat_to_tree(flat_list):
    node_map = {}
    root = None
    for item in flat_list:
        node_map[item['id']] = {
            'id': item['id'],
            'text': item['text'],
            'personalityFit': item['personalityFit'],
            'nodeType': item['nodeType'],
            'children': [],
        }
        if item.get('parentId') is None:
            root = node_map[item['id']]

    for item in flat_list:
        if item.get('parentId') and item['parentId'] in node_map:
            node_map[item['parentId']]['children'].append(node_map[item['id']])

    return root, node_map


@app.route('/api/npc/create', methods=['POST'])
def create_npc():
    data = request.json
    npc_id = str(uuid.uuid4())
    name = data.get('name', '未命名NPC')
    personality = data.get('personality', {
        'extroversion': 50,
        'friendliness': 50,
        'humor': 50,
        'patience': 50,
        'curiosity': 50,
    })

    avatar_expression = determine_avatar_expression(personality)

    npcs[npc_id] = {
        'id': npc_id,
        'name': name,
        'personality': personality,
        'avatarExpression': avatar_expression,
        'dialogueTree': None,
        'flatNodes': [],
    }

    return jsonify({
        'id': npc_id,
        'name': name,
        'personality': personality,
        'avatarExpression': avatar_expression,
    })


@app.route('/api/npc/generate', methods=['POST'])
def generate_dialogue():
    data = request.json
    npc_id = data.get('npcId')
    personality = data.get('personality')

    if npc_id not in npcs:
        return jsonify({'error': 'NPC not found'}), 404

    npc = npcs[npc_id]
    if personality:
        npc['personality'] = personality
        npc['avatarExpression'] = determine_avatar_expression(personality)

    root = generate_root_node(npc['personality'])
    branches = generate_initial_branches(npc['personality'], root)
    root['children'] = branches

    npc['dialogueTree'] = root
    flat = _tree_to_flat(root)
    npc['flatNodes'] = flat

    positions = compute_layout(flat, root['id'])

    flow_nodes = []
    for item in flat:
        pos = positions.get(item['id'], {'x': 0, 'y': 0})
        flow_nodes.append({
            'id': item['id'],
            'type': 'dialogueNode',
            'data': {
                'label': item['text'],
                'personalityFit': item['personalityFit'],
                'nodeType': item['nodeType'],
                'npcId': npc_id,
            },
            'position': pos,
        })

    flow_edges = []
    for item in flat:
        if item.get('parentId'):
            edge_type = 'smoothstep'
            style = {'stroke': '#888888', 'strokeWidth': 2}
            if item['nodeType'] == 'branch':
                edge_type = 'bezier'
                style = {'stroke': '#e94560', 'strokeWidth': 2}
            flow_edges.append({
                'id': f"e-{item['parentId']}-{item['id']}",
                'source': item['parentId'],
                'target': item['id'],
                'type': edge_type,
                'style': style,
                'animated': False,
            })

    return jsonify({
        'nodes': flow_nodes,
        'edges': flow_edges,
        'rootId': root['id'],
        'avatarExpression': npc['avatarExpression'],
    })


@app.route('/api/npc/update_node', methods=['POST'])
def update_node():
    data = request.json
    npc_id = data.get('npcId')
    node_id = data.get('nodeId')
    text = data.get('text', '')

    if npc_id not in npcs:
        return jsonify({'error': 'NPC not found'}), 404

    npc = npcs[npc_id]

    for item in npc['flatNodes']:
        if item['id'] == node_id:
            item['text'] = text
            item['personalityFit'] = compute_personality_fit(npc['personality'], text)
            return jsonify({
                'nodeId': node_id,
                'text': text,
                'personalityFit': item['personalityFit'],
            })

    return jsonify({'error': 'Node not found'}), 404


@app.route('/api/npc/add_child', methods=['POST'])
def add_child():
    data = request.json
    npc_id = data.get('npcId')
    parent_id = data.get('parentId')
    text = data.get('text', '')
    personality = data.get('personality', {})

    if npc_id not in npcs:
        return jsonify({'error': 'NPC not found'}), 404

    npc = npcs[npc_id]
    p = personality or npc['personality']

    fit = compute_personality_fit(p, text)
    new_id = str(uuid.uuid4())

    parent_found = False
    for item in npc['flatNodes']:
        if item['id'] == parent_id:
            parent_found = True
            break

    if not parent_found:
        return jsonify({'error': 'Parent node not found'}), 404

    new_node = {
        'id': new_id,
        'text': text,
        'personalityFit': fit,
        'nodeType': 'branch',
        'parentId': parent_id,
    }
    npc['flatNodes'].append(new_node)

    parent_item = None
    for item in npc['flatNodes']:
        if item['id'] == parent_id:
            parent_item = item
            break

    sibling_count = sum(1 for item in npc['flatNodes'] if item.get('parentId') == parent_id)
    parent_pos = None
    for item in npc['flatNodes']:
        if item['id'] == parent_id:
            parent_pos = (0, 0)
            break

    return jsonify({
        'node': {
            'id': new_id,
            'type': 'dialogueNode',
            'data': {
                'label': text,
                'personalityFit': fit,
                'nodeType': 'branch',
                'npcId': npc_id,
            },
            'position': {
                'x': sibling_count * 250,
                'y': 50 + (len(npc['flatNodes']) // 5) * 120,
            },
        },
        'edge': {
            'id': f"e-{parent_id}-{new_id}",
            'source': parent_id,
            'target': new_id,
            'type': 'bezier',
            'style': {'stroke': '#e94560', 'strokeWidth': 2},
            'animated': False,
        },
        'personalityFit': fit,
    })


@app.route('/api/npc/suggest_child', methods=['POST'])
def suggest_child():
    data = request.json
    npc_id = data.get('npcId')
    personality = data.get('personality', {})
    parent_text = data.get('parentText', '')

    if npc_id not in npcs:
        return jsonify({'error': 'NPC not found'}), 404

    npc = npcs[npc_id]
    p = personality or npc['personality']

    suggestion = generate_child_suggestion(p, parent_text)
    return jsonify(suggestion)


@app.route('/api/npc/delete_node', methods=['POST'])
def delete_node():
    data = request.json
    npc_id = data.get('npcId')
    node_id = data.get('nodeId')

    if npc_id not in npcs:
        return jsonify({'error': 'NPC not found'}), 404

    npc = npcs[npc_id]

    descendants = set()
    queue = [node_id]
    while queue:
        current = queue.pop(0)
        descendants.add(current)
        for item in npc['flatNodes']:
            if item.get('parentId') == current:
                queue.append(item['id'])

    npc['flatNodes'] = [item for item in npc['flatNodes'] if item['id'] not in descendants]

    return jsonify({'deletedIds': list(descendants)})


@app.route('/api/npc/<npc_id>/export', methods=['GET'])
def export_dialogue(npc_id):
    if npc_id not in npcs:
        return jsonify({'error': 'NPC not found'}), 404

    npc = npcs[npc_id]
    root, _ = _flat_to_tree(npc['flatNodes'])

    return jsonify({
        'id': npc['id'],
        'name': npc['name'],
        'personality': npc['personality'],
        'avatarExpression': npc['avatarExpression'],
        'dialogueTree': root,
    })


@app.route('/api/npc/list', methods=['GET'])
def list_npcs():
    result = []
    for npc_id, npc in npcs.items():
        result.append({
            'id': npc['id'],
            'name': npc['name'],
            'personality': npc['personality'],
            'avatarExpression': npc['avatarExpression'],
        })
    return jsonify(result)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
