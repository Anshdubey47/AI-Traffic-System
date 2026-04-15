from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from traffic_simulation import TrafficSimulation
from rl_agent import QLearningAgent
from genetic_algorithm import RouteOptimizerGA
from collections import deque
import logging
import threading
import time
import numpy as np
import os

# Mute standard logging for a clean terminal
log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

app = Flask(__name__)
CORS(app) # Allow frontend to communicate with backend
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_PORT = int(os.environ.get('EVOCITY_PORT', '5050'))
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

# Persistent AI simulation instances
sim = TrafficSimulation(size=10)
rl_agent = QLearningAgent(state_size=(4, 4), action_size=2)
rl_agent.simulate_trained_model()
monitor_x, monitor_y = 5, 5 # Monitoring Central Intersection

# Real-time runtime state
UPDATE_INTERVAL_SECONDS = 0.5
state_lock = threading.Lock()
background_started = False
simulation_running = False
latest_snapshot = {}
manual_overrides = {}
last_loop_error = None
tick_count = 0

metrics = {
    "congestion_history": deque(maxlen=120),
    "reward_history": deque(maxlen=120),
}

def build_grid_cells(congestion_map):
    grid_cells = []
    for r in range(sim.size):
        row = []
        for c in range(sim.size):
            vehicle_count = int(round(congestion_map[r, c]))
            row.append({
                "vehicle_count": vehicle_count,
                "signal_state": "GREEN" if sim.signals[r, c] == 0 else "RED",
                "congestion_level": round(min(1.0, vehicle_count / 25.0), 3),
            })
        grid_cells.append(row)
    return grid_cells

def decode_route(best_route):
    path = [(0, 0)]
    cx, cy = 0, 0
    for move in best_route:
        if move == 0:
            cx += 1
        else:
            cy += 1
        path.append((cx, cy))
    return path

def compute_best_path(congestion_map):
    ga = RouteOptimizerGA(grid=congestion_map, start=(0, 0), end=(9, 9), pop_size=20, generations=10)
    best_route, _ = ga.run()
    return decode_route(best_route)

def apply_manual_overrides():
    for (x, y), signal_phase in manual_overrides.items():
        if 0 <= x < sim.size and 0 <= y < sim.size:
            sim.signals[x, y] = signal_phase
            sim.phase_age[x, y] = 0

def run_realtime_tick():
    global latest_snapshot, last_loop_error, tick_count

    tick_started_at = time.time()

    # 1. Smart baseline timing across all intersections.
    sim.smart_signal_timing(min_green=3, max_green=12, switch_ratio=1.3, backlog_gap=8)

    # 2. Agent inference at monitored critical intersection.
    state = sim.get_state(monitor_x, monitor_y)
    action = rl_agent.predict(state)
    sim.signals[monitor_x, monitor_y] = action

    # 3. Optional manual overrides applied after AI decisions.
    apply_manual_overrides()

    # 4. Live traffic data drives simulation evolution.
    live_profile = sim.get_live_traffic_data()
    sim.step(
        use_real_profile=False,
        ns_arrival_rate=live_profile["ns_lambda"],
        ew_arrival_rate=live_profile["ew_lambda"],
    )

    # 5. Metrics and route optimization snapshot.
    congestion_map = sim.ns_wait + sim.ew_wait
    reward = float(-(sim.ns_wait[monitor_x, monitor_y] + sim.ew_wait[monitor_x, monitor_y]))
    total_congestion = float(np.sum(congestion_map))
    metrics["congestion_history"].append(total_congestion)
    metrics["reward_history"].append(reward)

    best_path = compute_best_path(congestion_map)
    latency_ms = int((time.time() - tick_started_at) * 1000)

    latest_snapshot = {
        "timestamp": time.time(),
        "latency_ms": latency_ms,
        "sim_hour": live_profile["hour"],
        "traffic_profile": live_profile["label"],
        "profile_source": live_profile["source"],
        "arrivals": {
            "ns_per_tick": live_profile["ns_lambda"],
            "ew_per_tick": live_profile["ew_lambda"],
        },
        "grid": build_grid_cells(congestion_map),
        "best_path": best_path,
        "signals": sim.signals.tolist(),
        "reward": reward,
        "congestion_total": total_congestion,
        "metrics": {
            "congestion_history": list(metrics["congestion_history"]),
            "reward_history": list(metrics["reward_history"]),
        },
    }

    tick_count += 1
    last_loop_error = None
    socketio.emit("traffic_update", latest_snapshot)

def realtime_loop():
    global simulation_running, last_loop_error
    while True:
        try:
            if simulation_running:
                with state_lock:
                    run_realtime_tick()
        except Exception as exc:
            last_loop_error = str(exc)
            print(f"[loop-error] {last_loop_error}")
            socketio.emit("system_error", {"message": str(exc)})
        socketio.sleep(UPDATE_INTERVAL_SECONDS)

def ensure_background_loop():
    global background_started
    if not background_started:
        background_started = True
        socketio.start_background_task(realtime_loop)

@app.before_request
def ensure_loop_before_request():
    ensure_background_loop()

@socketio.on("connect")
def on_connect():
    ensure_background_loop()
    if latest_snapshot:
        socketio.emit("traffic_update", latest_snapshot)

@app.route('/')
def dashboard_home():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/index.html')
def dashboard_index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/script.js')
def dashboard_script():
    return send_from_directory(BASE_DIR, 'script.js')

@app.route('/style.css')
def dashboard_style():
    return send_from_directory(BASE_DIR, 'style.css')

@app.route('/vellore_data.js')
def vellore_data():
    return send_from_directory(BASE_DIR, 'vellore_data.js')

@app.after_request
def add_no_cache_headers(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/traffic', methods=['GET'])
def get_traffic():
    if latest_snapshot:
        return jsonify(latest_snapshot)
    return jsonify({"status": "warming_up"})

@app.route('/control/start', methods=['POST'])
def control_start():
    global simulation_running
    ensure_background_loop()
    simulation_running = True
    return jsonify({"status": "running"})

@app.route('/control/stop', methods=['POST'])
def control_stop():
    global simulation_running
    simulation_running = False
    return jsonify({"status": "paused"})

@app.route('/control/status', methods=['GET'])
def control_status():
    return jsonify({
        "running": simulation_running,
        "has_snapshot": bool(latest_snapshot),
        "overrides": len(manual_overrides),
        "tick_count": tick_count,
        "last_error": last_loop_error,
    })

@app.route('/api/step', methods=['GET'])
def step():
    # Compatibility endpoint now returns latest real-time snapshot.
    return get_traffic()

@app.route('/signal/override', methods=['POST'])
def signal_override():
    payload = request.get_json(silent=True) or {}
    x = int(payload.get("x", -1))
    y = int(payload.get("y", -1))
    state = str(payload.get("state", "AUTO")).upper()

    if not (0 <= x < sim.size and 0 <= y < sim.size):
        return jsonify({"error": "x and y must be within grid bounds"}), 400

    if state == "AUTO":
        manual_overrides.pop((x, y), None)
    elif state == "GREEN":
        manual_overrides[(x, y)] = 0
    elif state == "RED":
        manual_overrides[(x, y)] = 1
    else:
        return jsonify({"error": "state must be GREEN, RED, or AUTO"}), 400

    return jsonify({"status": "ok", "overrides": len(manual_overrides)})

if __name__ == '__main__':
    print("==================================================")
    print(f"EvoCity Real-Time API + WebSocket live on http://127.0.0.1:{DEFAULT_PORT}")
    print("Open the dashboard and watch live 'traffic_update' stream.")
    print("==================================================")
    socketio.run(app, host='127.0.0.1', port=DEFAULT_PORT, debug=False, use_reloader=False, allow_unsafe_werkzeug=True)
