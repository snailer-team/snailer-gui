from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
import redis
import numpy as np
from sklearn.ensemble import IsolationForest
import threading
import time
from typing import Dict

app = Flask(__name__)
app.config['SECRET_KEY'] = 'elonx-hard-secret!'
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

r = redis.from_url("redis://redis:6379/0")
models: Dict[str, IsolationForest] = {}
WINDOW_SIZE = 500
MIN_TRAIN_SIZE = 100
RETRAIN_INTERVAL = 60

def store_metric(agent_id: str, response_time: float, uptime: float) -> bool:
    features = np.array([response_time, 1.0 - uptime], dtype=np.float32).tobytes()
    key = f"metrics:{agent_id}"
    r.rpush(key, features)
    r.ltrim(key, -WINDOW_SIZE, -1)

    anomaly = False
    if agent_id in models:
        feat_array = np.frombuffer(features, dtype=np.float32).reshape(1, -1)
        pred = models[agent_id].predict(feat_array)[0]
        anomaly = pred == -1
    return anomaly

def retrain_model(agent_id: str):
    key = f"metrics:{agent_id}"
    num_points = r.llen(key)
    if num_points < MIN_TRAIN_SIZE:
        return

    end = -1
    start = max(-WINDOW_SIZE, -num_points)
    data_bytes = r.lrange(key, start, end)
    data = np.array([np.frombuffer(b, dtype=np.float32) for b in data_bytes])

    model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42, n_jobs=-1)
    model.fit(data)
    models[agent_id] = model

    socketio.emit('model_updated', {'agent_id': agent_id, 'trained_on': len(data)}, broadcast=True)

def retrain_loop():
    while True:
        keys = [k.decode().split(':')[1] for k in r.keys("metrics:*")]
        for agent_id in keys:
            retrain_model(agent_id)
        time.sleep(RETRAIN_INTERVAL)

threading.Thread(target=retrain_loop, daemon=True).start()

@app.route('/report_metric', methods=['POST'])
def report_metric():
    data = request.get_json()
    if not isinstance(data, list):
        data = [data]
    results = []
    for m in data:
        aid = m['agent_id']
        rt = m['response_time']
        up = m.get('uptime', 1.0)
        anom = store_metric(aid, rt, up)
        socketio.emit('status_update', {'agent_id': aid, 'anomaly': anom, 'response_time': rt, 'uptime': up}, broadcast=True)
        results.append({'agent_id': aid, 'anomaly': anom})
    return jsonify({'status': 'ok', 'results': results})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'agents': list(models.keys())})

@socketio.on('connect')
def handle_connect():
    emit('connected', {'agents': list(models.keys())})

@socketio.on('get_statuses')
def get_statuses(data):
    agent_ids = data['agent_ids']
    statuses = {}
    for aid in agent_ids:
        key = f"metrics:{aid}"
        last_bytes = r.lindex(key, -1)
        if last_bytes:
            feat = np.frombuffer(last_bytes, dtype=np.float32).reshape(1, -1)
            if aid in models:
                score = models[aid].decision_function(feat)[0]
                pred = models[aid].predict(feat)[0] == -1
            else:
                score = 0.0
                pred = False
            statuses[aid] = {'anomaly': pred, 'score': float(score)}
    emit('statuses', statuses)

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
