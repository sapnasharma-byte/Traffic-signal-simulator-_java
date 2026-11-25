// ===========================================
// SMART TRAFFIC SIGNAL SIMULATOR
// ===========================================

// ---------- CIRCULAR QUEUE ----------
class CircularQueue {
    constructor() {
        this.items = [];
    }

    enqueue(item) {
        this.items.push(item);
    }

    dequeue() {
        return this.items.shift() || null;
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

// ---------- PRIORITY QUEUE ----------
class PriorityQueue {
    constructor() {
        this.items = [];
    }

    enqueue(item, priority = 1) {
        this.items.push({ item, priority });

        this.items.sort((a, b) =>
            a.priority - b.priority
        );
    }

    dequeue() {
        if (this.items.length === 0) return null;

        return this.items.shift().item;
    }

    isEmpty() {
        return this.items.length === 0;
    }
}

// ---------- GRAPH ----------
const roadGraph = {
    North: ["East", "South", "West"],
    East: ["North", "South", "West"],
    South: ["North", "East", "West"],
    West: ["North", "East", "South"]
};

// ---------- VARIABLES ----------
const roads = ["North", "East", "South", "West"];

const signalQueue = new CircularQueue();
const emergencyQueue = new PriorityQueue();

roads.forEach(road => signalQueue.enqueue(road));

let currentRoad = null;

let isRunning = false;
let emergencyMode = false;

let phase = "ready";

let greenTime = 12;
let yellowTime = 3;
let allRedTime = 1;
let emergencyTime = 8;

let remainingTime = greenTime;

let timerInterval = null;


// ===========================================
// HELPERS
// ===========================================

// ---------- LOG ----------
function addLog(message) {
    const logBox = document.getElementById("logs");

    if (!logBox) return;

    const entry = document.createElement("div");

    entry.className = "log-entry";

    entry.textContent =
        new Date().toLocaleTimeString() + " | " + message;

    logBox.prepend(entry);

    console.log(message);
}

// ---------- STATUS ----------
function updateStatus(message) {
    document.getElementById("status").textContent = message;
}

// ---------- TIMER ----------
function updateTimer() {
    document.getElementById("timer").textContent =
        remainingTime;
}

// ---------- CURRENT ROAD ----------
function updateCurrentRoad() {
    document.getElementById("currentRoad").textContent =
        currentRoad || "None";
}


// ===========================================
// ACTUAL TRAFFIC LIGHT CONTROL
// ===========================================

function setSignalColor(road, color) {

    const signal = document.getElementById(
        "signal" + road
    );

    if (!signal) {
        console.error("Signal missing:", road);
        return;
    }

    const red = signal.querySelector(".red-light");
    const yellow = signal.querySelector(".yellow-light");
    const green = signal.querySelector(".green-light");

    // Turn OFF all bulbs first
    red.classList.remove("active");
    yellow.classList.remove("active");
    green.classList.remove("active");

    // Turn ON selected bulb
    if (color === "red") {
        red.classList.add("active");
    }

    else if (color === "yellow") {
        yellow.classList.add("active");
    }

    else if (color === "green") {
        green.classList.add("active");
    }

    console.log(road + " signal:", color);
}


// ---------- ALL RED ----------
function allRoadsRed() {
    roads.forEach(road => {
        setSignalColor(road, "red");
        stopCars(road);
    });
}


// ===========================================
// VEHICLE CONTROL
// ===========================================

function getCars(road) {
    return document.querySelectorAll(
        ".car-" + road.toLowerCase()
    );
}

// ---------- STOP CARS ----------
function stopCars(road) {
    const cars = getCars(road);

    cars.forEach(car => {
        car.style.animationPlayState = "paused";
    });
}

// ---------- MOVE CARS ----------
function moveCars(road) {
    const cars = getCars(road);

    cars.forEach(car => {
        car.style.animationPlayState = "running";
    });
}

// ---------- STOP ALL CARS ----------
function stopAllCars() {
    roads.forEach(road => stopCars(road));
}

// ---------- GREEN ROAD ----------
function activateRoad(road) {

    allRoadsRed();

    setSignalColor(road, "green");

    moveCars(road);
}


// ===========================================
// GREEN SIGNAL
// ===========================================

function startGreen(road, duration = greenTime) {

    currentRoad = road;

    phase = "green";

    remainingTime = duration;

    emergencyMode = false;

    activateRoad(road);

    updateCurrentRoad();

    updateTimer();

    updateStatus(road + " Road GREEN");

    addLog(road + " signal is GREEN");

    startTimer();
}


// ===========================================
// TIMER
// ===========================================

function startTimer() {

    clearInterval(timerInterval);

    if (!isRunning) return;

    timerInterval = setInterval(function () {

        if (!isRunning) return;

        remainingTime--;

        updateTimer();

        if (remainingTime <= 0) {

            clearInterval(timerInterval);

            timerInterval = null;

            phaseFinished();
        }

    }, 1000);
}


// ===========================================
// PHASE MANAGEMENT
// ===========================================

function phaseFinished() {

    if (phase === "green") {
        startYellow();
    }

    else if (phase === "yellow") {
        startAllRed();
    }

    else if (phase === "allred") {
        selectNextRoad();
    }

    else if (phase === "emergency") {
        startYellow();
    }
}


// ---------- YELLOW ----------
function startYellow() {

    phase = "yellow";

    remainingTime = yellowTime;

    allRoadsRed();

    setSignalColor(currentRoad, "yellow");

    stopCars(currentRoad);

    updateTimer();

    updateStatus(currentRoad + " Road YELLOW");

    addLog("Yellow signal - transition");

    startTimer();
}


// ---------- ALL RED ----------
function startAllRed() {

    phase = "allred";

    remainingTime = allRedTime;

    allRoadsRed();

    updateTimer();

    updateStatus("All RED - Safety Clearance");

    addLog("All roads RED - clearance");

    startTimer();
}


// ===========================================
// SELECT NEXT ROAD
// ===========================================

function selectNextRoad() {

    // Emergency priority first
    if (!emergencyQueue.isEmpty()) {

        const emergency = emergencyQueue.dequeue();

        startEmergency(emergency);

        return;
    }

    // Normal traffic rotation
    const nextRoad = signalQueue.dequeue();

    if (nextRoad) {
        signalQueue.enqueue(nextRoad);

        startGreen(nextRoad);
    }
}


// ===========================================
// EMERGENCY SYSTEM
// ===========================================

function requestEmergency(road, type = "Ambulance") {

    if (!roads.includes(road)) {

        addLog("ERROR: Invalid road " + road);

        alert("Invalid road name!");

        return;
    }

    const emergency = {
        road: road,
        type: type
    };

    emergencyQueue.enqueue(emergency, 1);

    addLog("Emergency requested: " + type + " on " + road);

    // Start simulator if stopped
    if (!isRunning) {
        startSimulation();
    }

    // Emergency is already on green road
    if (currentRoad === road && phase === "green") {

        emergencyMode = true;

        remainingTime = emergencyTime;

        phase = "emergency";

        updateTimer();

        updateStatus("🚨 " + type + " - " + road + " GREEN");

        addLog("Emergency road already GREEN");

        startTimer();

        return;
    }

    // Transition immediately toward emergency
    if (phase === "green" || phase === "emergency") {

        clearInterval(timerInterval);

        startYellow();
    }
}


// ---------- EMERGENCY GREEN ----------
function startEmergency(emergency) {

    currentRoad = emergency.road;

    emergencyMode = true;

    phase = "emergency";

    remainingTime = emergencyTime;

    activateRoad(currentRoad);

    updateCurrentRoad();

    updateTimer();

    updateStatus(
        "🚨 " + emergency.type + " - " +
        currentRoad + " GREEN"
    );

    addLog(
        "Priority GREEN granted to " +
        emergency.type + " on " +
        currentRoad
    );

    startTimer();
}


// ===========================================
// SIMULATION CONTROL
// ===========================================

// ---------- START ----------
function startSimulation() {

    if (isRunning) return;

    isRunning = true;

    updateStatus("Simulation Running");

    addLog("Simulation started");

    // First start
    if (phase === "ready") {

        allRoadsRed();

        const firstRoad = signalQueue.dequeue();

        signalQueue.enqueue(firstRoad);

        startGreen(firstRoad);

        return;
    }

    // Resume
    if (phase === "green" || phase === "emergency") {

        if (currentRoad) {
            activateRoad(currentRoad);
        }
    }

    else if (phase === "yellow") {

        allRoadsRed();

        setSignalColor(currentRoad, "yellow");
    }

    else if (phase === "allred") {

        allRoadsRed();
    }

    startTimer();
}


// ---------- PAUSE ----------
function pauseSimulation() {

    if (!isRunning) return;

    isRunning = false;

    clearInterval(timerInterval);

    timerInterval = null;

    stopAllCars();

    updateStatus("Simulation Paused");

    addLog("Simulation paused");
}


// ---------- RESET ----------
function resetSimulation() {

    clearInterval(timerInterval);

    timerInterval = null;

    isRunning = false;

    emergencyMode = false;

    currentRoad = null;

    phase = "ready";

    remainingTime = greenTime;

    // Reset road queue
    signalQueue.items = [];

    roads.forEach(road => {
        signalQueue.enqueue(road);
    });

    // Reset emergency queue
    emergencyQueue.items = [];

    allRoadsRed();

    updateCurrentRoad();

    updateTimer();

    updateStatus("Ready");

    addLog("Simulation reset");
}


// ===========================================
// TEST CASES
// ===========================================

// ---------- NORMAL ----------
function testNormal() {

    resetSimulation();

    addLog("Normal test started");

    startSimulation();
}


// ---------- BOUNDARY ----------
function testBoundary() {

    resetSimulation();

    greenTime = 3;

    yellowTime = 1;

    allRedTime = 1;

    remainingTime = greenTime;

    addLog("Boundary test: minimum timings");

    startSimulation();
}


// ---------- INVALID ----------
function testInvalid() {

    addLog("Invalid input test");

    requestEmergency("UnknownRoad");
}


// ---------- EMERGENCY ----------
function testEmergency() {

    resetSimulation();

    addLog("Emergency test started");

    startSimulation();

    setTimeout(function () {

        if (isRunning) {
            requestEmergency("East", "Ambulance");
        }

    }, 2000);
}


// ===========================================
// BUTTON EVENTS
// ===========================================

document.getElementById("startBtn")
    .addEventListener("click", startSimulation);

document.getElementById("pauseBtn")
    .addEventListener("click", pauseSimulation);

document.getElementById("resetBtn")
    .addEventListener("click", resetSimulation);


// ===========================================
// INITIAL SETUP
// ===========================================

allRoadsRed();

updateTimer();

updateStatus("Ready");

updateCurrentRoad();

addLog("Smart Traffic Simulator loaded");

console.log("Traffic simulator ready!");
console.log("Road Graph:", roadGraph);


// Make functions accessible to HTML buttons
window.startSimulation = startSimulation;
window.pauseSimulation = pauseSimulation;
window.resetSimulation = resetSimulation;

window.requestEmergency = requestEmergency;

window.testNormal = testNormal;
window.testBoundary = testBoundary;
window.testInvalid = testInvalid;
window.testEmergency = testEmergency;