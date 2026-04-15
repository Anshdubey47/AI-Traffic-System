# EvoCity: Self-Optimizing Smart City

A complete Python-based simulation demonstrating how modern Artificial Intelligence handles intensive urban traffic challenges. This project powerfully integrates **Reinforcement Learning (Q-Learning)** for traffic signal control algorithms alongside **Genetic Algorithms** representing biological evolution to flawlessly path-find optimal grid routes inside a computational Digital Twin environment.

## 🚀 How to Run the Project Locally

1. Ensure Python 3.x is installed on your machine.
2. Open the terminal and easily install required external modules via pip:
   ```bash
   pip install -r requirements.txt
   ```
3. Boot the environment:
   ```bash
   python main.py
   ```
4. Observe the console printing live simulation epochs. Wait roughly 5 seconds, then check the directory for visually rendered analytics: `rl_training.png` and `ga_evolution.png`.

## ⚡ Real-Time Mode (WebSocket)

1. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
2. Start backend server:
    ```bash
    python app.py
    ```
3. Open `index.html` in a browser (or with VS Code Live Server).
4. Click **Start AI Core**. Frontend subscribes to `traffic_update` WebSocket events and updates live.

### Live Payload Shape
Each grid cell is streamed as:

```json
{
   "vehicle_count": 12,
   "signal_state": "RED",
   "congestion_level": 0.48
}
```

### REST Endpoints
- `GET /traffic` returns the latest real-time snapshot.
- `GET /api/step` compatibility alias to latest snapshot.
- `POST /signal/override` manual override payload:
   ```json
   { "x": 3, "y": 4, "state": "GREEN" }
   ```
   `state` supports `GREEN`, `RED`, `AUTO`.

## 📊 Real Traffic Dataset Mode (CSV)

EvoCity now supports **real-data style hourly demand input** using `real_traffic_data.csv`.

- File used automatically by the Flask API: `real_traffic_data.csv`
- Expected schema:
   - `hour` (0-23)
   - `period` (label text)
   - `ns_lambda` (North/South arrival rate per simulation tick)
   - `ew_lambda` (East/West arrival rate per simulation tick)

If the CSV has valid 24-hour entries, EvoCity uses this dataset directly. If not, it safely falls back to the built-in demand profile.

## ⚙️ Module Technical Explanations

- **`traffic_simulation.py`**: The "Digital Twin" of the city. We model a dynamic 10x10 matrix of intersection nodes where Poisson-distributed integers simulate cars continually arriving. 
- **`rl_agent.py`**: A deterministic Q-learning mathematical agent. It actively observes traffic intersection queues and dynamically toggles coordinate signals (green/red) iteratively maximizing a reduction in cumulative congestion.
- **`genetic_algorithm.py`**: A biological parallel. Traces thousands of potential routes matrix layouts. It leverages fundamental evolutionary processes (such as generation tracking, survival of the fittest/elite fitness, and step mutation) to find an uninterrupted path with mathematically the lowest recorded traffic footprint.
- **`visualization.py`**: Takes raw data tensors directly from our agents and bridges them with `matplotlib` yielding smoothed-out analytical plots tracking algorithmic progress curves.

## 🌐 Extending EvoCity into a Full Web Application Dashboard
To pivot this codebase up into a robust product (Flask + React/Next.js):
- **Backend (API)**: Place `main.py` functionality inside FastApi/Flask decorators. Emit live JSON socket streams indicating matrix integer counts.
- **Frontend (UI/UX)**: Connect React state maps to build an animated CSS Grid layout mapping visually mapping to coordinates. Cars can render as pulsing layout dots, and each node tile switches color boundaries representing local Signal phase states natively.
- **Dashboard Refactor**: Port output metrics out of `matplotlib` natively integrating robust libraries including Recharts or Chart.js for beautiful browser-supported analytical panels updating seamlessly alongside the visual Digital Twin in Real Time.

---

## 🎤 Viva / Demo Presentation Script

**What You Should Say During Your Evaluator Walkthrough:**

*"Good [Morning/Afternoon]. Welcome to EvoCity, an intelligent digital twin city simulation I've developed from scratch specifically highlighting how state-of-the-art AI systems inherently solve broad urban congestion dilemmas locally.*

*My architecture isolates two very independent machine learning paradigms concurrently iterating on a single multi-dimensional data grid network.*

*First internally we execute our Reinforcement Learning module leveraging Q-Learning. Rather than standard static timer loops for traffic lights, intersection states 'train' iteratively by interacting. At each frame, the node identifies surrounding density context, acts deliberately triggering signal phase switches, and grades the outcome mapping out an objective function. Demonstrated extensively inside `rl_training.png`, you can visibly see my agent progressively securing higher rewards as raw wait times objectively plunge!*

*Secondly, parallel to signal logic adapting in the background, we invoke a rigorous Genetic Algorithm controlling spatial car traversal. Consider any delivery operation forced to map this city grid. Our evolutionary setup aggregates sequences representing potential paths structurally as 'chromosomes', measures route fitness penalizing tight bottleneck zones recursively mapping generations, applies specific crossover and mutating logics—outputting an absolute convergence point marking the mathematically fastest route. See `.png` outputs highlighting precise timeline convergence tracking.*

*The primary accomplishment here is raw algorithmic cohesion. By actively preserving a purely Python runtime alongside native Numpy computations, I’ve proven resilient, self-adapting optimization frameworks successfully function elegantly mapping real-world logic avoiding overly nested, bloated dependencies."*

### 🌟 Key Points to Highlight with The Evaluator:
1. **Dynamic Volatility Modeling:** Emphasize that unlike standardized graph charting algorithms (e.g., A* or Dijkstra’s), your integrated GA manages routing specifically adapting across a *constantly mutating ecosystem environment.*
2. **Foundational Integrity:** Impress by clearly stating you avoided generic off-the-shelf "AI wrapper libraries", personally coding the localized Q-Table Bellman update algorithms organically. 
3. **Conceptual Synergy:** Center entirely how mapping distinct domains—Reinforcement capabilities layered with Evolutionary properties—allows complete synchronization resulting in a fully realized, stable multi-agent software solution.
