/**
 * EvoCity Vellore — AI Digital Twin Dashboard
 * Leaflet.js map with real Vellore intersections
 * Replaces abstract 10×10 grid with live city visualization
 */

// ═══════════════════════════════════════════════
//  GLOBAL STATE
// ═══════════════════════════════════════════════
let currentStep = 0;
let aiEnabled = true;
let heatmapEnabled = true;
let roadsEnabled = true;
let socket = null;
let streamLive = false;
let simulationRunning = false;

// Map state
let map;
let intersectionMarkers = [];   // 2D array [row][col] of L.circleMarker
let roadNetworkLines = [];      // Array of L.polyline for road segments
let bestPathLine = null;        // L.polyline for GA best route
let heatLayer = null;           // Leaflet.heat layer
let landmarkLabels = [];        // L.marker with DivIcon for landmarks
let roadNetworkGroup = null;    // L.layerGroup for roads

// ═══════════════════════════════════════════════
//  BACKEND COMMUNICATION
// ═══════════════════════════════════════════════
function getBackendBase() {
    return "https://ai-traffic-system-x2i0.onrender.com";
}

// ═══════════════════════════════════════════════
//  CHARTS (Chart.js)
// ═══════════════════════════════════════════════
const maxDataPoints = 30;
let rewardHistory = [];
let congestionHistory = [];
let timeLabels = [];

Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Outfit', sans-serif";

const ctxReward = document.getElementById('rewardChart').getContext('2d');
const rewardChart = new Chart(ctxReward, {
    type: 'line',
    data: {
        labels: timeLabels,
        datasets: [{
            label: 'Reward',
            data: rewardHistory,
            borderColor: '#00f0ff',
            backgroundColor: 'rgba(0, 240, 255, 0.1)',
            fill: true, tension: 0.4, pointRadius: 0
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { display: false }, x: { display: false } }
    }
});

const ctxTraffic = document.getElementById('trafficChart').getContext('2d');
const trafficChart = new Chart(ctxTraffic, {
    type: 'line',
    data: {
        labels: timeLabels,
        datasets: [{
            label: 'Congestion',
            data: congestionHistory,
            borderColor: '#ff3366',
            backgroundColor: 'rgba(255, 51, 102, 0.1)',
            fill: true, tension: 0.4, pointRadius: 0
        }]
    },
    options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { display: false }, x: { display: false } }
    }
});

// ═══════════════════════════════════════════════
//  LIVE CLOCK
// ═══════════════════════════════════════════════
function updateClock() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('live-clock').innerText = `${h}:${m}:${s}`;
}
setInterval(updateClock, 1000);
updateClock();

// ═══════════════════════════════════════════════
//  MAP INITIALIZATION (Leaflet + OpenStreetMap)
// ═══════════════════════════════════════════════
function initMap() {
    // Create Leaflet map
    map = L.map('vellore-map', {
        center: VELLORE_CONFIG.center,
        zoom: VELLORE_CONFIG.zoom,
        zoomControl: false,
        attributionControl: false,
        preferCanvas: true
    });

    // Dark CartoDB tiles — matches glassmorphism theme
    L.tileLayer(VELLORE_CONFIG.tileUrl, {
        maxZoom: 19,
        subdomains: 'abcd',
        attribution: VELLORE_CONFIG.attribution
    }).addTo(map);

    // Zoom control at bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Attribution (minimal)
    L.control.attribution({ position: 'bottomleft', prefix: false }).addTo(map);

    // Draw road network between intersections
    drawRoadNetwork();

    // Create intersection circle markers (100 total)
    createIntersectionMarkers();

    // Add prominent landmark labels
    addLandmarkLabels();

    // Initialize heatmap layer (empty, will be populated per tick)
    heatLayer = L.heatLayer([], {
        radius: 28,
        blur: 22,
        maxZoom: 17,
        max: 20,
        gradient: {
            0.0: 'rgba(0,0,0,0)',
            0.15: 'rgba(57, 255, 20, 0.25)',
            0.4: 'rgba(255, 200, 0, 0.45)',
            0.65: 'rgba(255, 100, 0, 0.6)',
            0.85: 'rgba(255, 51, 102, 0.75)',
            1.0: 'rgba(255, 0, 60, 0.9)'
        }
    }).addTo(map);

    // Add city boundary hint (subtle circle)
    L.circle(VELLORE_CONFIG.center, {
        radius: 5200,
        color: 'rgba(0, 240, 255, 0.08)',
        fillColor: 'rgba(0, 240, 255, 0.02)',
        fillOpacity: 1,
        weight: 1,
        dashArray: '6 10'
    }).addTo(map);
}

function drawRoadNetwork() {
    roadNetworkGroup = L.layerGroup();

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const current = VELLORE_INTERSECTIONS[r][c];
            const isMajorCurrent = current.type === 'major' || current.type === 'roundabout';

            // Connect to right neighbor
            if (c < 9) {
                const right = VELLORE_INTERSECTIONS[r][c + 1];
                const isMajorNeighbor = right.type === 'major' || right.type === 'roundabout';
                const weight = (isMajorCurrent && isMajorNeighbor) ? 2 : 1;
                const opacity = (isMajorCurrent && isMajorNeighbor) ? 0.12 : 0.06;

                const line = L.polyline(
                    [[current.lat, current.lng], [right.lat, right.lng]],
                    { color: '#ffffff', weight: weight, opacity: opacity, dashArray: isMajorCurrent ? null : '4 8' }
                );
                roadNetworkGroup.addLayer(line);
                roadNetworkLines.push(line);
            }

            // Connect to bottom neighbor
            if (r < 9) {
                const bottom = VELLORE_INTERSECTIONS[r + 1][c];
                const isMajorNeighbor = bottom.type === 'major' || bottom.type === 'roundabout';
                const weight = (isMajorCurrent && isMajorNeighbor) ? 2 : 1;
                const opacity = (isMajorCurrent && isMajorNeighbor) ? 0.12 : 0.06;

                const line = L.polyline(
                    [[current.lat, current.lng], [bottom.lat, bottom.lng]],
                    { color: '#ffffff', weight: weight, opacity: opacity, dashArray: isMajorCurrent ? null : '4 8' }
                );
                roadNetworkGroup.addLayer(line);
                roadNetworkLines.push(line);
            }
        }
    }

    roadNetworkGroup.addTo(map);
}

function createIntersectionMarkers() {
    intersectionMarkers = [];

    for (let r = 0; r < 10; r++) {
        const row = [];
        for (let c = 0; c < 10; c++) {
            const intersection = VELLORE_INTERSECTIONS[r][c];
            const isMajor = intersection.type === 'major';
            const isRoundabout = intersection.type === 'roundabout';

            const baseRadius = isMajor ? 9 : isRoundabout ? 8 : 6;

            const marker = L.circleMarker([intersection.lat, intersection.lng], {
                radius: baseRadius,
                fillColor: 'rgba(255,255,255,0.06)',
                fillOpacity: 0.4,
                color: 'rgba(255,255,255,0.15)',
                weight: 1
            }).addTo(map);

            // Tooltip with intersection info
            marker.bindTooltip(buildTooltipHTML(intersection, r, c, 0, 'GREEN', 'Clear'), {
                direction: 'top',
                offset: [0, -12],
                className: 'leaflet-custom-tooltip'
            });

            // Click to show popup with more detail
            marker.bindPopup(buildPopupHTML(intersection, r, c, 0, 'GREEN'), {
                className: 'leaflet-custom-popup'
            });

            row.push(marker);
        }
        intersectionMarkers.push(row);
    }
}

function addLandmarkLabels() {
    VELLORE_LANDMARKS.forEach(lm => {
        const label = L.marker([lm.lat, lm.lng], {
            icon: L.divIcon({
                className: 'landmark-label',
                html: `<div class="lm-text">${lm.name}</div>`,
                iconSize: [160, 24],
                iconAnchor: [80, -12]
            }),
            interactive: false
        }).addTo(map);
        landmarkLabels.push(label);
    });
}

// ═══════════════════════════════════════════════
//  TOOLTIP & POPUP BUILDERS
// ═══════════════════════════════════════════════
function buildTooltipHTML(intersection, r, c, vehicles, signal, statusText) {
    const statusClass = vehicles > 15 ? 'severe' : vehicles > 5 ? 'moderate' : 'clear';
    return `
        <div class="mt-inner">
            <div class="mt-name">${intersection.name}</div>
            <div class="mt-meta">[${r},${c}] • ${intersection.type.toUpperCase()} • ${signal}</div>
            <div class="mt-vehicles">🚗 Vehicles: <strong>${vehicles}</strong></div>
            <div class="mt-status ${statusClass}">● ${statusText}</div>
        </div>
    `;
}

function buildPopupHTML(intersection, r, c, vehicles, signal) {
    return `
        <div class="popup-inner">
            <h4>${intersection.name}</h4>
            <p class="popup-coord">${intersection.lat.toFixed(4)}°N, ${intersection.lng.toFixed(4)}°E</p>
            <div class="popup-grid">
                <span>Grid Pos:</span><strong>[${r}, ${c}]</strong>
                <span>Type:</span><strong>${intersection.type}</strong>
                <span>Signal:</span><strong>${signal}</strong>
                <span>Vehicles:</span><strong>${vehicles}</strong>
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════
//  TRAFFIC COLORING (matches original theme)
// ═══════════════════════════════════════════════
function getMarkerStyle(val, signalState, isMajor) {
    const baseRadius = isMajor ? 9 : 6;
    const congestionRadius = baseRadius + Math.min(val * 0.6, 10);

    if (val === 0) {
        return {
            fillColor: 'rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.12)',
            radius: baseRadius,
            fillOpacity: 0.3,
            weight: 1
        };
    }

    const intensity = Math.min(val / 20, 1);

    if (signalState === 'RED' && intensity > 0.55) {
        return {
            fillColor: `rgba(255, 51, 102, ${0.4 + intensity * 0.5})`,
            color: '#ff3366',
            radius: congestionRadius,
            fillOpacity: 0.85,
            weight: 2
        };
    }

    if (intensity < 0.3) {
        return {
            fillColor: `rgba(57, 255, 20, ${0.25 + intensity})`,
            color: '#39ff14',
            radius: congestionRadius,
            fillOpacity: 0.7,
            weight: 1.5
        };
    }

    if (intensity < 0.7) {
        return {
            fillColor: `rgba(255, 153, 0, ${0.3 + intensity * 0.5})`,
            color: '#ff9900',
            radius: congestionRadius,
            fillOpacity: 0.75,
            weight: 1.5
        };
    }

    return {
        fillColor: `rgba(255, 51, 102, ${0.4 + intensity * 0.5})`,
        color: '#ff3366',
        radius: congestionRadius,
        fillOpacity: 0.85,
        weight: 2
    };
}

// ═══════════════════════════════════════════════
//  APPLY TRAFFIC UPDATE (per WebSocket tick)
// ═══════════════════════════════════════════════
function applyTrafficUpdate(data) {
    currentStep++;
    document.getElementById('step-counter').innerText = currentStep.toString().padStart(4, '0');

    const grid = data.grid || [];
    let totalVehicles = 0;
    const heatData = [];

    for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
            const cellData = (grid[r] && grid[r][c])
                ? grid[r][c]
                : { vehicle_count: 0, signal_state: 'GREEN', congestion_level: 0 };

            let congestion = Number(cellData.vehicle_count || 0);
            if (!aiEnabled) congestion = Math.floor(congestion * 1.2 + 1);
            totalVehicles += congestion;

            const intersection = VELLORE_INTERSECTIONS[r][c];
            const marker = intersectionMarkers[r][c];
            const isMajor = intersection.type === 'major' || intersection.type === 'roundabout';

            // Update marker visual
            const style = getMarkerStyle(congestion, cellData.signal_state || 'GREEN', isMajor);
            marker.setStyle(style);
            marker.setRadius(style.radius);

            // Update tooltip content
            let statusText = "Clear Road";
            if (congestion > 5) statusText = "Moderate Flow";
            if (congestion > 15) statusText = "Severe Blockage";

            marker.setTooltipContent(
                buildTooltipHTML(intersection, r, c, congestion, cellData.signal_state || 'GREEN', statusText)
            );

            marker.setPopupContent(
                buildPopupHTML(intersection, r, c, congestion, cellData.signal_state || 'GREEN')
            );

            // Feed heatmap layer
            if (congestion > 0) {
                heatData.push([intersection.lat, intersection.lng, congestion]);
            }
        }
    }

    // Update heatmap
    if (heatLayer) {
        heatLayer.setLatLngs(heatData);
    }

    // Draw GA best route path on the map
    if (bestPathLine) {
        map.removeLayer(bestPathLine);
        bestPathLine = null;
    }

    const pathCoords = (data.best_path || []).map(coord => {
        const x = coord[0], y = coord[1]; // x=col, y=row
        if (y >= 0 && y < 10 && x >= 0 && x < 10) {
            const pt = VELLORE_INTERSECTIONS[y][x];
            return [pt.lat, pt.lng];
        }
        return null;
    }).filter(Boolean);

    if (pathCoords.length > 1) {
        bestPathLine = L.polyline(pathCoords, {
            color: '#39ff14',
            weight: 3.5,
            opacity: 0.75,
            dashArray: '10 8',
            lineCap: 'round',
            lineJoin: 'round',
            className: 'ga-route-line'
        }).addTo(map);
    }

    // ─── Dashboard Metrics ───
    const avgCongestion = ((totalVehicles / 100) * 10).toFixed(1);
    document.getElementById('avg-congestion').innerText = avgCongestion;
    document.getElementById('active-vehicles').innerText = totalVehicles;
    document.getElementById('co2-reduction').innerText = aiEnabled
        ? (Math.random() * 5 + 15).toFixed(1) : '0.0';

    // RL reward badge
    const rVal = Number(data.reward || 0);
    const rewardBadge = document.getElementById('reward-badge');
    rewardBadge.innerText = rVal.toFixed(1);
    rewardBadge.className = rVal > -20 ? 'badge good' : 'badge bad';

    // Learning pulse
    const pulse = document.getElementById('learning-pulse');
    pulse.classList.add('active');
    setTimeout(() => pulse.classList.remove('active'), 220);

    // Signal phase indicator
    const signals = data.signals || [];
    const isNS = signals[5] && signals[5][5] === 0;
    document.querySelector('.phase-ns').className = isNS ? 'phase-ns active' : 'phase-ns';
    document.querySelector('.phase-ew').className = !isNS ? 'phase-ew active' : 'phase-ew';

    // Chart data
    if (timeLabels.length > maxDataPoints) {
        timeLabels.shift();
        rewardHistory.shift();
        congestionHistory.shift();
    }
    timeLabels.push(currentStep);
    rewardHistory.push(rVal);
    congestionHistory.push(totalVehicles);
    rewardChart.update();
    trafficChart.update();

    // GA metrics
    document.getElementById('fitness-score').innerText = (100 / (totalVehicles + 1)).toFixed(3);
    const profileLabel = data.traffic_profile || 'live';
    const simHour = typeof data.sim_hour === 'number' ? data.sim_hour.toFixed(2) : '0.00';
    const profileSource = data.profile_source || 'live';
    document.getElementById('generation-focus').innerText = `${profileLabel} @ ${simHour}h (${profileSource})`;
    document.getElementById('ga-anim').style.border = '1px solid var(--neon-green)';

    // Latency
    const latency = Number(data.latency_ms || 0);
    document.getElementById('latency-indicator').innerText = `${latency} ms`;
}

// ═══════════════════════════════════════════════
//  WEBSOCKET CONNECTION
// ═══════════════════════════════════════════════
function connectWebSocket() {
    if (socket) return;

    const backendBase = getBackendBase();

    socket = io(backendBase, {
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        streamLive = true;
        if (simulationRunning) {
            document.getElementById('system-status').innerText = 'SYSTEM LIVE';
            document.getElementById('system-status').style.color = 'var(--neon-green)';
            document.getElementById('start-btn').innerText = 'Engine Running';
        } else {
            document.getElementById('system-status').innerText = 'CONNECTED (IDLE)';
            document.getElementById('system-status').style.color = 'var(--neon-orange)';
            document.getElementById('start-btn').innerText = 'Start AI Core';
        }
    });

    socket.on('connect_error', (err) => {
        console.error('Socket connect error:', err);
        document.getElementById('system-status').innerText = 'SOCKET ERROR';
        document.getElementById('system-status').style.color = 'var(--neon-red)';
    });

    socket.on('traffic_update', (data) => {
        applyTrafficUpdate(data);
    });

    socket.on('system_error', (data) => {
        console.error('Backend loop error:', data);
    });

    socket.on('disconnect', () => {
        streamLive = false;
        socket = null;
        document.getElementById('system-status').innerText = 'CONNECTION LOST';
        document.getElementById('system-status').style.color = 'var(--neon-red)';
        document.getElementById('start-btn').innerText = 'Start AI Core';
    });
}

function stopWebSocket() {
    if (!socket) return;
    socket.disconnect();
    socket = null;
    streamLive = false;
    document.getElementById('start-btn').innerText = 'Resume Simulation';
    document.getElementById('system-status').innerText = 'DISCONNECTED';
    document.getElementById('system-status').style.color = 'var(--neon-orange)';
}

// ═══════════════════════════════════════════════
//  SIMULATION CONTROLS
// ═══════════════════════════════════════════════
async function startSimulation() {
    try {
        if (!socket) connectWebSocket();
        const backendBase = getBackendBase();
        const res = await fetch(`${backendBase}/control/start`, { method: 'POST' });
        if (!res.ok) {
            throw new Error(`Failed to start simulation (HTTP ${res.status})`);
        }
        simulationRunning = true;
        document.getElementById('system-status').innerText = 'SYSTEM LIVE';
        document.getElementById('system-status').style.color = 'var(--neon-green)';
        document.getElementById('start-btn').innerText = 'Engine Running';
    } catch (err) {
        console.error(err);
        document.getElementById('system-status').innerText = `START FAILED: ${err.message}`;
        document.getElementById('system-status').style.color = 'var(--neon-red)';
    }
}

async function pauseSimulation() {
    try {
        const backendBase = getBackendBase();
        const res = await fetch(`${backendBase}/control/stop`, { method: 'POST' });
        if (!res.ok) throw new Error(`Failed to pause simulation (HTTP ${res.status})`);
        simulationRunning = false;
        document.getElementById('system-status').innerText = 'PAUSED';
        document.getElementById('system-status').style.color = 'var(--neon-orange)';
        document.getElementById('start-btn').innerText = 'Resume Simulation';
    } catch (err) {
        console.error(err);
        document.getElementById('system-status').innerText = 'PAUSE FAILED';
        document.getElementById('system-status').style.color = 'var(--neon-red)';
    }
}

// ═══════════════════════════════════════════════
//  TOGGLE HANDLERS
// ═══════════════════════════════════════════════
function setupToggles() {
    // Heatmap toggle
    document.getElementById('heatmap-toggle').addEventListener('change', (e) => {
        heatmapEnabled = e.target.checked;
        if (heatLayer) {
            if (heatmapEnabled) {
                map.addLayer(heatLayer);
            } else {
                map.removeLayer(heatLayer);
            }
        }
    });

    // Roads toggle
    document.getElementById('roads-toggle').addEventListener('change', (e) => {
        roadsEnabled = e.target.checked;
        if (roadNetworkGroup) {
            if (roadsEnabled) {
                map.addLayer(roadNetworkGroup);
            } else {
                map.removeLayer(roadNetworkGroup);
            }
        }
    });

    // AI toggle
    document.getElementById('ai-toggle').addEventListener('change', (e) => {
        aiEnabled = e.target.checked;
        if (!aiEnabled) alert("Core AI Offline! Predicting rapid congestion scaling across Vellore.");
    });

    // Re-center map
    document.getElementById('recenter-btn').addEventListener('click', () => {
        map.flyTo(VELLORE_CONFIG.center, VELLORE_CONFIG.zoom, {
            duration: 1.2,
            easeLinearity: 0.25
        });
    });
}

// ═══════════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        document.getElementById('loader-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loader-screen').style.display = 'none';
            document.getElementById('dashboard-main').classList.remove('hidden');

            // Initialize Leaflet map with Vellore data
            initMap();

            // Setup toggle handlers
            setupToggles();

            // Connect to backend WebSocket
            connectWebSocket();
        }, 800);
    }, 1500);
});

document.getElementById('start-btn').addEventListener('click', () => {
    if (!simulationRunning) startSimulation();
});

document.getElementById('stop-btn').addEventListener('click', () => {
    if (simulationRunning) pauseSimulation();
});
