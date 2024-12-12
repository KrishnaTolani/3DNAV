// Set up scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x808080);

// Set up camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 30, 50);

// Set up renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Create UI
const uiContainer = document.createElement('div');
uiContainer.style.cssText = `
    position: fixed;
    top: 20px;
    left: 20px;
    background: rgba(0, 0, 0, 0.8);
    padding: 20px;
    border-radius: 8px;
    color: white;
    font-family: Arial, sans-serif;
    min-width: 250px;
`;
document.body.appendChild(uiContainer);

// Create location section
const locationLabel = document.createElement('div');
locationLabel.textContent = 'Your Location:';
locationLabel.style.cssText = `
    font-size: 16px;
    margin-bottom: 5px;
    color: white;
`;

const startSelect = document.createElement('select');
startSelect.style.cssText = `
    width: 100%;
    padding: 8px;
    margin-bottom: 15px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: white;
`;

// Create destination section
const destinationLabel = document.createElement('div');
destinationLabel.textContent = 'Destination:';
destinationLabel.style.cssText = `
    font-size: 16px;
    margin-bottom: 5px;
    color: white;
`;

const endSelect = document.createElement('select');
endSelect.style.cssText = `
    width: 100%;
    padding: 8px;
    margin-bottom: 15px;
    border-radius: 4px;
    border: 1px solid #ccc;
    background: white;
`;

// Create show path button
const showPathButton = document.createElement('button');
showPathButton.textContent = 'Show Path';
showPathButton.style.cssText = `
    width: 100%;
    padding: 10px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    margin-bottom: 10px;
`;

showPathButton.onmouseover = () => {
    showPathButton.style.background = '#45a049';
};
showPathButton.onmouseout = () => {
    showPathButton.style.background = '#4CAF50';
};

// Add options
const points = ['Ticket Counter', 'Bypass', 'Stair'];
points.forEach(point => {
    const startOption = new Option(point, point);
    const endOption = new Option(point, point);
    startSelect.add(startOption);
    endSelect.add(endOption);
});

// Set default values
startSelect.value = 'Ticket Counter';
endSelect.value = 'Stair';

// Add elements to container
uiContainer.appendChild(locationLabel);
uiContainer.appendChild(startSelect);
uiContainer.appendChild(destinationLabel);
uiContainer.appendChild(endSelect);
uiContainer.appendChild(showPathButton);

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 10, 5);
scene.add(directionalLight);

// Set up controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableZoom = true;
controls.enablePan = true;
controls.enableRotate = true;

// Variables for simulation
let currentMarker = null;
let pathLines = [];
let simulationPath = [];
let simulationStep = 0;
let isSimulating = false;

// Load the model
const loader = new THREE.GLTFLoader();
loader.load('./railway_station.glb', function(gltf) {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, 0, -center.z);
    scene.add(model);
}, undefined, console.error);

function clearPath() {
    pathLines.forEach(line => scene.remove(line));
    pathLines = [];
    if (currentMarker) {
        scene.remove(currentMarker);
        currentMarker = null;
    }
    isSimulating = false;
}

function createPathAndSimulation() {
    clearPath();
    
    const start = startSelect.value;
    const end = endSelect.value;

    // Create a simple line for the path
    const points = [];
    const startPoint = { x: -36.918, y: 0.1, z: 8.65 };  // Ticket Counter - moved backward
    const bypassPoint = { x: -37.598, y: 0.1, z: -0.277 }; // Bypass - moved backward
    const stairPoint = { x: 59.56, y: 0.1, z: -0.735 };   // Stair - moved backward

    if (start === 'Ticket Counter' && end === 'Stair') {
        points.push(new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z));
        points.push(new THREE.Vector3(bypassPoint.x, bypassPoint.y, bypassPoint.z));
        points.push(new THREE.Vector3(stairPoint.x, stairPoint.y, stairPoint.z));
    } else if (start === 'Bypass' && end === 'Stair') {
        points.push(new THREE.Vector3(bypassPoint.x, bypassPoint.y, bypassPoint.z));
        points.push(new THREE.Vector3(stairPoint.x, stairPoint.y, stairPoint.z));
    } else if (start === 'Ticket Counter' && end === 'Bypass') {
        points.push(new THREE.Vector3(startPoint.x, startPoint.y, startPoint.z));
        points.push(new THREE.Vector3(bypassPoint.x, bypassPoint.y, bypassPoint.z));
    }

    // Create the line with enhanced visibility
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({ 
        color: 0x00ff00,
        linewidth: 3,
        transparent: true,
        opacity: 0.8
    });
    
    // Create glowing line effect
    const glowMaterial = new THREE.LineBasicMaterial({
        color: 0x00ff00,
        linewidth: 6,
        transparent: true,
        opacity: 0.3
    });
    
    const line = new THREE.Line(geometry, material);
    const glowLine = new THREE.Line(geometry, glowMaterial);
    
    scene.add(line);
    scene.add(glowLine);
    pathLines.push(line);
    pathLines.push(glowLine);

    // Create marker with enhanced visibility
    const markerGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const markerMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 0.5
    });
    currentMarker = new THREE.Mesh(markerGeometry, markerMaterial);
    scene.add(currentMarker);

    // Set up simulation path
    simulationPath = points;
    isSimulating = true;
    simulationStep = 0;
}

// Add click handler for show path button
showPathButton.addEventListener('click', () => {
    const start = startSelect.value;
    const end = endSelect.value;
    
    if (start === end) {
        alert('Please select different start and end points');
        return;
    }
    
    createPathAndSimulation();
});

function updateSimulation() {
    if (!isSimulating || !currentMarker || simulationPath.length < 2) return;

    // Calculate position along the path
    const currentSegment = Math.floor(simulationStep);
    const segmentStep = simulationStep - currentSegment;
    
    if (currentSegment >= simulationPath.length - 1) {
        simulationStep = 0;
        return;
    }

    const start = simulationPath[currentSegment];
    const end = simulationPath[currentSegment + 1];
    
    currentMarker.position.x = start.x + (end.x - start.x) * segmentStep;
    currentMarker.position.y = start.y + (end.y - start.y) * segmentStep;
    currentMarker.position.z = start.z + (end.z - start.z) * segmentStep;

    simulationStep += 0.001; // Speed of marker movement
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    updateSimulation();
    controls.update();
    renderer.render(scene, camera);
}

// Start animation
animate();

// Handle window resize
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}