from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
import uuid
import time
import threading

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

PRESETS = {
    'star': {
        'type': 'star',
        'mass': 100,
        'color': '#ffcc00',
        'radius': 8,
        'name_prefix': '恒星'
    },
    'planet': {
        'type': 'planet',
        'mass': 10,
        'color': '#4fc3f7',
        'radius': 4,
        'name_prefix': '行星'
    },
    'blackhole': {
        'type': 'blackhole',
        'mass': 500,
        'color': '#1a1a2e',
        'radius': 12,
        'name_prefix': '黑洞'
    }
}

bodies = {}
body_counter = {'star': 0, 'planet': 0, 'blackhole': 0}
simulation_state = {
    'running': False,
    'timestamp': 0,
    'bodies': []
}
lock = threading.Lock()

@app.route('/api/presets', methods=['GET'])
def get_presets():
    return jsonify({
        'success': True,
        'presets': PRESETS
    })

@app.route('/api/create-body', methods=['POST'])
def create_body():
    data = request.json
    body_type = data.get('type', 'star')
    preset = PRESETS.get(body_type, PRESETS['star'])
    
    with lock:
        body_counter[body_type] += 1
        body_id = str(uuid.uuid4())
        name = f"{preset['name_prefix']}-{body_counter[body_type]}"
        
        body = {
            'id': body_id,
            'type': body_type,
            'name': name,
            'mass': data.get('mass', preset['mass']),
            'x': data.get('x', 0),
            'y': data.get('y', 0),
            'vx': data.get('vx', 0),
            'vy': data.get('vy', 0),
            'color': data.get('color', preset['color']),
            'radius': data.get('radius', preset['radius'])
        }
        
        bodies[body_id] = body
        simulation_state['bodies'].append({
            'id': body_id,
            'x': body['x'],
            'y': body['y'],
            'vx': body['vx'],
            'vy': body['vy']
        })
    
    socketio.emit('body-created', body, broadcast=True)
    
    return jsonify({
        'success': True,
        'body': body
    })

@app.route('/api/bodies', methods=['GET'])
def get_bodies():
    with lock:
        return jsonify({
            'success': True,
            'bodies': list(bodies.values())
        })

@app.route('/api/reset', methods=['POST'])
def reset_simulation():
    global body_counter, simulation_state
    with lock:
        bodies.clear()
        body_counter = {'star': 0, 'planet': 0, 'blackhole': 0}
        simulation_state = {
            'running': False,
            'timestamp': 0,
            'bodies': []
        }
    
    socketio.emit('simulation-reset', broadcast=True)
    
    return jsonify({'success': True})

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    with lock:
        emit('initial-state', {
            'bodies': list(bodies.values()),
            'simulation_state': simulation_state
        })

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

@socketio.on('simulation-update')
def handle_simulation_update(data):
    global simulation_state
    
    timestamp = data.get('timestamp', 0)
    updated_bodies = data.get('bodies', [])
    
    with lock:
        simulation_state['timestamp'] = timestamp
        
        for updated in updated_bodies:
            body_id = updated.get('id')
            if body_id in bodies:
                bodies[body_id]['x'] = updated.get('x', bodies[body_id]['x'])
                bodies[body_id]['y'] = updated.get('y', bodies[body_id]['y'])
                bodies[body_id]['vx'] = updated.get('vx', bodies[body_id]['vx'])
                bodies[body_id]['vy'] = updated.get('vy', bodies[body_id]['vy'])
        
        simulation_state['bodies'] = [
            {
                'id': b['id'],
                'x': b['x'],
                'y': b['y'],
                'vx': b['vx'],
                'vy': b['vy']
            } for b in bodies.values()
        ]
    
    emit('simulation-update', {
        'timestamp': timestamp,
        'bodies': simulation_state['bodies']
    }, broadcast=True, include_self=False)

@socketio.on('body-created')
def handle_body_created(body):
    with lock:
        body_id = body.get('id')
        if body_id and body_id not in bodies:
            bodies[body_id] = body
            body_type = body.get('type', 'star')
            body_counter[body_type] = max(
                body_counter[body_type],
                int(body.get('name', '').split('-')[-1]) if '-' in body.get('name', '') else 0
            )
    
    emit('body-created', body, broadcast=True, include_self=False)

@socketio.on('body-merged')
def handle_body_merged(data):
    primary_id = data.get('primaryId')
    secondary_id = data.get('secondaryId')
    result = data.get('result')
    timestamp = data.get('timestamp', time.time())
    
    with lock:
        if primary_id in bodies:
            del bodies[primary_id]
        if secondary_id in bodies:
            del bodies[secondary_id]
        
        if result:
            result_id = result.get('id')
            if result_id:
                bodies[result_id] = result
        
        simulation_state['bodies'] = [
            {
                'id': b['id'],
                'x': b['x'],
                'y': b['y'],
                'vx': b['vx'],
                'vy': b['vy']
            } for b in bodies.values()
        ]
    
    event_data = {
        'timestamp': timestamp,
        'primaryId': primary_id,
        'secondaryId': secondary_id,
        'result': result,
        'primaryName': data.get('primaryName', ''),
        'secondaryName': data.get('secondaryName', ''),
        'resultName': data.get('resultName', '')
    }
    
    emit('body-merged', event_data, broadcast=True)

@socketio.on('toggle-simulation')
def handle_toggle_simulation(data):
    global simulation_state
    running = data.get('running', False)
    simulation_state['running'] = running
    emit('simulation-toggled', {'running': running}, broadcast=True)

if __name__ == '__main__':
    print("Starting Galaxy Sandbox Backend on port 5000...")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
