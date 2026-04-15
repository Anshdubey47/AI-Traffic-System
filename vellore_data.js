/**
 * EvoCity — Vellore Digital Twin
 * Real intersection coordinates mapped to 10×10 simulation grid
 * Based on actual Vellore, Tamil Nadu road network
 * 
 * Coverage: Katpadi (North) → Officers' Line (South)
 *           Western Bypass → VIT / Ariyur (East)
 */

const VELLORE_CONFIG = {
    center: [12.9340, 79.1390],
    zoom: 14,
    minZoom: 12,
    maxZoom: 18,
    cityName: "Vellore",
    state: "Tamil Nadu, India",
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    tileUrlSatellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
};

/**
 * 10×10 grid of real Vellore intersections.
 * Each entry: { lat, lng, name, type }
 * Types: 'major' (key junction), 'signal' (traffic light), 
 *        'roundabout' (circle), 'minor' (small road)
 */
const VELLORE_INTERSECTIONS = [
    // ── Row 0: Katpadi Area (Northern Vellore) ──
    [
        { lat: 12.9718, lng: 79.1175, name: "Katpadi Bridge North", type: "minor" },
        { lat: 12.9712, lng: 79.1228, name: "Katpadi Housing Board", type: "minor" },
        { lat: 12.9698, lng: 79.1279, name: "Katpadi Market Rd", type: "signal" },
        { lat: 12.9705, lng: 79.1325, name: "Katpadi Main Rd", type: "major" },
        { lat: 12.9695, lng: 79.1378, name: "Katpadi Bypass Jn", type: "signal" },
        { lat: 12.9706, lng: 79.1432, name: "Katpadi Railway Stn", type: "major" },
        { lat: 12.9710, lng: 79.1475, name: "Katpadi East Bridge", type: "minor" },
        { lat: 12.9700, lng: 79.1518, name: "Katpadi–VIT Rd", type: "signal" },
        { lat: 12.9692, lng: 79.1560, name: "VIT Entrance Rd", type: "major" },
        { lat: 12.9688, lng: 79.1615, name: "VIT Main Gate", type: "major" }
    ],

    // ── Row 1: Between Katpadi & Sathuvachari ──
    [
        { lat: 12.9628, lng: 79.1182, name: "Brindavan Colony", type: "minor" },
        { lat: 12.9635, lng: 79.1225, name: "Brindavan Main Rd", type: "minor" },
        { lat: 12.9620, lng: 79.1272, name: "Phase II Colony", type: "signal" },
        { lat: 12.9625, lng: 79.1320, name: "Sathuvachari North", type: "major" },
        { lat: 12.9630, lng: 79.1370, name: "New Bus Stand Rd", type: "signal" },
        { lat: 12.9618, lng: 79.1425, name: "Gandhinagar Link", type: "minor" },
        { lat: 12.9622, lng: 79.1468, name: "Sathuvachari East", type: "signal" },
        { lat: 12.9615, lng: 79.1515, name: "Thorapadi Jn", type: "major" },
        { lat: 12.9608, lng: 79.1558, name: "Thorapadi Circle", type: "roundabout" },
        { lat: 12.9600, lng: 79.1608, name: "VIT Back Gate Rd", type: "minor" }
    ],

    // ── Row 2: Sathuvachari ──
    [
        { lat: 12.9548, lng: 79.1178, name: "Allapuram West", type: "minor" },
        { lat: 12.9555, lng: 79.1232, name: "Allapuram Circle", type: "roundabout" },
        { lat: 12.9540, lng: 79.1280, name: "Old Katpadi Rd", type: "signal" },
        { lat: 12.9545, lng: 79.1328, name: "Phase I Sathuvachari", type: "minor" },
        { lat: 12.9538, lng: 79.1375, name: "Sathuvachari Main Rd", type: "major" },
        { lat: 12.9542, lng: 79.1420, name: "Sathuvachari Bus Stop", type: "signal" },
        { lat: 12.9535, lng: 79.1465, name: "18th Cross Rd", type: "minor" },
        { lat: 12.9530, lng: 79.1510, name: "Indira Nagar Jn", type: "signal" },
        { lat: 12.9525, lng: 79.1555, name: "Bagayam Link Rd", type: "major" },
        { lat: 12.9520, lng: 79.1602, name: "Bagayam Circle", type: "roundabout" }
    ],

    // ── Row 3: RTO / Gandhi Nagar ──
    [
        { lat: 12.9468, lng: 79.1185, name: "Anna Nagar West", type: "minor" },
        { lat: 12.9472, lng: 79.1228, name: "Anna Nagar Jn", type: "signal" },
        { lat: 12.9458, lng: 79.1275, name: "Gandhi Nagar Main", type: "major" },
        { lat: 12.9462, lng: 79.1322, name: "Gandhi Nagar Mkt", type: "signal" },
        { lat: 12.9455, lng: 79.1368, name: "RTO Office Jn", type: "major" },
        { lat: 12.9460, lng: 79.1415, name: "Saraswathi School Rd", type: "minor" },
        { lat: 12.9452, lng: 79.1462, name: "Rangapuram Rd", type: "minor" },
        { lat: 12.9448, lng: 79.1508, name: "Vasanthapuram Jn", type: "signal" },
        { lat: 12.9445, lng: 79.1552, name: "Bagayam Main Rd", type: "major" },
        { lat: 12.9440, lng: 79.1598, name: "Ariyur West", type: "minor" }
    ],

    // ── Row 4: Bus Stand Area ──
    [
        { lat: 12.9388, lng: 79.1180, name: "Jail Rd North", type: "signal" },
        { lat: 12.9392, lng: 79.1225, name: "District Court Rd", type: "signal" },
        { lat: 12.9378, lng: 79.1272, name: "Periyar Stand West", type: "major" },
        { lat: 12.9382, lng: 79.1318, name: "Old Bus Stand Circle", type: "roundabout" },
        { lat: 12.9375, lng: 79.1365, name: "Town Hall Rd", type: "signal" },
        { lat: 12.9380, lng: 79.1412, name: "Vellore Bus Stand", type: "major" },
        { lat: 12.9372, lng: 79.1458, name: "TCS Rd Junction", type: "signal" },
        { lat: 12.9368, lng: 79.1505, name: "Green Circle Rd", type: "minor" },
        { lat: 12.9362, lng: 79.1548, name: "Palar Bridge North", type: "major" },
        { lat: 12.9358, lng: 79.1595, name: "Ariyur Main Rd", type: "signal" }
    ],

    // ── Row 5: Central Vellore / Long Bazaar (AI Monitored Zone) ──
    [
        { lat: 12.9308, lng: 79.1175, name: "Jail Rd South", type: "minor" },
        { lat: 12.9312, lng: 79.1222, name: "DM Office Rd", type: "signal" },
        { lat: 12.9298, lng: 79.1268, name: "Thottapalayam N", type: "minor" },
        { lat: 12.9302, lng: 79.1315, name: "Long Bazaar West", type: "major" },
        { lat: 12.9295, lng: 79.1362, name: "Long Bazaar Central", type: "major" },
        { lat: 12.9300, lng: 79.1408, name: "★ Central Junction", type: "major" },
        { lat: 12.9292, lng: 79.1455, name: "Tamil Sangam Rd", type: "signal" },
        { lat: 12.9288, lng: 79.1502, name: "Saidapet Main Rd", type: "major" },
        { lat: 12.9282, lng: 79.1545, name: "Saidapet Circle", type: "roundabout" },
        { lat: 12.9278, lng: 79.1592, name: "Saidapet East", type: "minor" }
    ],

    // ── Row 6: CMC Hospital Area ──
    [
        { lat: 12.9228, lng: 79.1182, name: "Velapadi West", type: "minor" },
        { lat: 12.9232, lng: 79.1228, name: "Velapadi Main Rd", type: "signal" },
        { lat: 12.9218, lng: 79.1275, name: "Thottapalayam S", type: "signal" },
        { lat: 12.9222, lng: 79.1322, name: "Flower Market Rd", type: "minor" },
        { lat: 12.9215, lng: 79.1368, name: "CMC Campus Gate", type: "major" },
        { lat: 12.9220, lng: 79.1415, name: "CMC Main Block", type: "major" },
        { lat: 12.9212, lng: 79.1462, name: "Ida Scudder Rd", type: "major" },
        { lat: 12.9208, lng: 79.1508, name: "CMC North Rd", type: "signal" },
        { lat: 12.9202, lng: 79.1552, name: "Vallimalai Rd Jn", type: "minor" },
        { lat: 12.9198, lng: 79.1598, name: "BV Nagar", type: "minor" }
    ],

    // ── Row 7: Old Town ──
    [
        { lat: 12.9148, lng: 79.1178, name: "Kagithapattarai W", type: "minor" },
        { lat: 12.9152, lng: 79.1225, name: "Kagithapattarai", type: "major" },
        { lat: 12.9138, lng: 79.1272, name: "Nethaji Rd", type: "signal" },
        { lat: 12.9142, lng: 79.1318, name: "MG Rd Junction", type: "signal" },
        { lat: 12.9135, lng: 79.1365, name: "Clive Rd North", type: "minor" },
        { lat: 12.9140, lng: 79.1412, name: "Collectorate", type: "major" },
        { lat: 12.9132, lng: 79.1458, name: "Clive Rd South", type: "signal" },
        { lat: 12.9128, lng: 79.1505, name: "Salavanpet Jn", type: "minor" },
        { lat: 12.9122, lng: 79.1548, name: "Kosapet Main", type: "major" },
        { lat: 12.9118, lng: 79.1595, name: "Kosapet East", type: "minor" }
    ],

    // ── Row 8: Fort Area ──
    [
        { lat: 12.9068, lng: 79.1185, name: "Fort Moat West", type: "minor" },
        { lat: 12.9072, lng: 79.1228, name: "Assumpthi Church Rd", type: "signal" },
        { lat: 12.9058, lng: 79.1275, name: "Fort Rd West", type: "major" },
        { lat: 12.9062, lng: 79.1322, name: "Fort West Gate", type: "major" },
        { lat: 12.9055, lng: 79.1368, name: "Jalakandeswarar Rd", type: "signal" },
        { lat: 12.9060, lng: 79.1415, name: "Vellore Fort Gate", type: "major" },
        { lat: 12.9052, lng: 79.1462, name: "Fort Museum Rd", type: "minor" },
        { lat: 12.9048, lng: 79.1508, name: "Redhills Main Rd", type: "major" },
        { lat: 12.9042, lng: 79.1552, name: "Redhills Cross", type: "signal" },
        { lat: 12.9038, lng: 79.1598, name: "Palar Bank Rd", type: "minor" }
    ],

    // ── Row 9: Officers' Line / Southern Vellore ──
    [
        { lat: 12.8988, lng: 79.1180, name: "Officers' Line West", type: "minor" },
        { lat: 12.8992, lng: 79.1225, name: "Officers' Line Main", type: "major" },
        { lat: 12.8978, lng: 79.1272, name: "Circular Rd West", type: "signal" },
        { lat: 12.8982, lng: 79.1318, name: "Circular Rd Center", type: "signal" },
        { lat: 12.8975, lng: 79.1365, name: "Circuit House Rd", type: "major" },
        { lat: 12.8980, lng: 79.1412, name: "Pernambut Road Jn", type: "signal" },
        { lat: 12.8972, lng: 79.1458, name: "Shenpakkam Link", type: "minor" },
        { lat: 12.8968, lng: 79.1505, name: "Shenpakkam Main", type: "signal" },
        { lat: 12.8962, lng: 79.1548, name: "Shenbakkam Bypass", type: "major" },
        { lat: 12.8958, lng: 79.1595, name: "Shenbakkam", type: "major" }
    ]
];

/**
 * Prominent landmark labels shown on high zoom
 */
const VELLORE_LANDMARKS = [
    { lat: 12.9706, lng: 79.1432, name: "🚉 Katpadi Railway Station", icon: "station" },
    { lat: 12.9688, lng: 79.1615, name: "🎓 VIT University", icon: "university" },
    { lat: 12.9380, lng: 79.1412, name: "🚌 Vellore Bus Stand", icon: "bus" },
    { lat: 12.9300, lng: 79.1408, name: "⭐ Central Junction (AI Node)", icon: "ai" },
    { lat: 12.9220, lng: 79.1415, name: "🏥 CMC Hospital", icon: "hospital" },
    { lat: 12.9140, lng: 79.1412, name: "🏛️ District Collectorate", icon: "govt" },
    { lat: 12.9060, lng: 79.1415, name: "🏰 Vellore Fort", icon: "fort" },
    { lat: 12.8992, lng: 79.1225, name: "🏢 Officers' Line", icon: "admin" }
];
