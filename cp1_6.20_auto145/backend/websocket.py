from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
from threading import Lock
import time
import models

socketio = SocketIO(cors_allowed_origins="*", async_mode='threading')

thread = None
thread_lock = Lock()

connected_clients = {}
survey_subscriptions = {}


def _get_connected_count():
    return len(connected_clients)


def _broadcast_stats(survey_id):
    stats = models.compute_stats(survey_id)
    if stats:
        socketio.emit('update_stats', {'survey_id': survey_id, 'stats': stats}, room=survey_id)


def setup_websocket_handlers():
    @socketio.on('connect')
    def handle_connect():
        client_id = request.sid
        connected_clients[client_id] = {
            'connected_at': time.time(),
            'surveys': []
        }
        emit('connected', {'client_id': client_id, 'total_clients': _get_connected_count()})

    @socketio.on('disconnect')
    def handle_disconnect():
        client_id = request.sid
        if client_id in connected_clients:
            for sid in connected_clients[client_id].get('surveys', []):
                leave_room(sid)
                if sid in survey_subscriptions:
                    survey_subscriptions[sid].discard(client_id)
                    if len(survey_subscriptions[sid]) == 0:
                        del survey_subscriptions[sid]
            del connected_clients[client_id]
        emit('client_disconnected', {'client_id': client_id, 'total_clients': _get_connected_count()}, broadcast=True)

    @socketio.on('subscribe_survey')
    def handle_subscribe(data):
        client_id = request.sid
        survey_id = data.get('survey_id') if isinstance(data, dict) else None
        if not survey_id:
            emit('error', {'message': 'survey_id is required'})
            return
        survey = models.get_survey(survey_id)
        if not survey:
            emit('survey_closed', {'survey_id': survey_id, 'reason': 'not_found'})
            return
        if survey.get('status') != 'active':
            emit('survey_closed', {'survey_id': survey_id, 'reason': survey.get('status')})
            return

        join_room(survey_id)
        if survey_id not in survey_subscriptions:
            survey_subscriptions[survey_id] = set()
        survey_subscriptions[survey_id].add(client_id)
        if client_id in connected_clients:
            if survey_id not in connected_clients[client_id]['surveys']:
                connected_clients[client_id]['surveys'].append(survey_id)

        stats = models.compute_stats(survey_id)
        emit('survey_subscribed', {
            'survey_id': survey_id,
            'stats': stats,
            'subscribers': len(survey_subscriptions.get(survey_id, set()))
        })

    @socketio.on('unsubscribe_survey')
    def handle_unsubscribe(data):
        client_id = request.sid
        survey_id = data.get('survey_id') if isinstance(data, dict) else None
        if not survey_id:
            return
        leave_room(survey_id)
        if client_id in connected_clients and survey_id in connected_clients[client_id]['surveys']:
            connected_clients[client_id]['surveys'].remove(survey_id)
        if survey_id in survey_subscriptions:
            survey_subscriptions[survey_id].discard(client_id)
            if len(survey_subscriptions[survey_id]) == 0:
                del survey_subscriptions[survey_id]

    @socketio.on('submit_answer_broadcast')
    def handle_answer_broadcast(data):
        survey_id = data.get('survey_id') if isinstance(data, dict) else None
        response = data.get('response') if isinstance(data, dict) else None
        if not survey_id or not response:
            return
        emit('new_answer', {
            'survey_id': survey_id,
            'response': response
        }, room=survey_id)
        _broadcast_stats(survey_id)

    @socketio.on('force_disconnect_all')
    def handle_force_disconnect(data):
        survey_id = data.get('survey_id') if isinstance(data, dict) else None
        if not survey_id:
            return
        socketio.emit('survey_closed', {
            'survey_id': survey_id,
            'reason': 'deleted'
        }, room=survey_id)
        for cid in list(survey_subscriptions.get(survey_id, set())):
            if cid in connected_clients and survey_id in connected_clients[cid]['surveys']:
                connected_clients[cid]['surveys'].remove(survey_id)
        if survey_id in survey_subscriptions:
            del survey_subscriptions[survey_id]


def broadcast_new_answer(survey_id, response):
    socketio.emit('new_answer', {
        'survey_id': survey_id,
        'response': response
    }, room=survey_id)
    _broadcast_stats(survey_id)


def broadcast_survey_closed(survey_id, reason='deleted'):
    socketio.emit('survey_closed', {
        'survey_id': survey_id,
        'reason': reason
    }, room=survey_id)
    for cid in list(survey_subscriptions.get(survey_id, set())):
        if cid in connected_clients and survey_id in connected_clients[cid]['surveys']:
            connected_clients[cid]['surveys'].remove(survey_id)
    if survey_id in survey_subscriptions:
        del survey_subscriptions[survey_id]


def start_stats_background_thread(app):
    global thread
    with thread_lock:
        if thread is None:
            thread = socketio.start_background_task(target=_stats_worker, app=app)


def _stats_worker(app):
    with app.app_context():
        while True:
            socketio.sleep(5)
            for sid in list(survey_subscriptions.keys()):
                try:
                    _broadcast_stats(sid)
                except Exception:
                    pass
