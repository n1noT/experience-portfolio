// max : Le score dans la console

import * as CANNON from './cannon-es.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// Create the scene
const scene = new THREE.Scene();

const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -9.82, 0), // m/s²
    defaultContactMaterial: {
        contactEquationStiffness: 1e7, 
        contactEquationRelaxation: 5
    }
    // Stabilization time in number of timesteps
});

const solver = new CANNON.GSSolver()
solver.iterations = 50
solver.tolerance = 0.0001
world.solver = new CANNON.SplitSolver(solver)


// Add a plane geometry
const groundBody = new CANNON.Body({
    type: CANNON.Body.STATIC,
    shape: new CANNON.Plane(),
})
groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0) // make it face up
groundBody.userData = { isGround: true };
world.addBody(groundBody)


// Function to create wall bodies and meshes
function createWall(position, color, size) {
    const wallBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Box(new CANNON.Vec3(size, 100000, size)),
    });
    wallBody.position.copy(position);
    world.addBody(wallBody);

    const wallGeometry = new THREE.BoxGeometry(size *2, size *2, size *2);
    const wallMaterial = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide, opacity: 0, transparent: true });
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.copy(position);
    scene.add(wallMesh);

    return { body: wallBody, mesh: wallMesh };
}

// Create walls
const wallNorth = createWall(new CANNON.Vec3(0, 100, -200), 'black', 100);
wallNorth.mesh.quaternion.copy(wallNorth.body.quaternion);

const wallSouth = createWall(new CANNON.Vec3(0, 100, 200), 'black', 100);
wallSouth.mesh.quaternion.copy(wallSouth.body.quaternion);

const wallEast = createWall(new CANNON.Vec3(200, 100, 0), 'black', 100);
wallEast.mesh.quaternion.copy(wallEast.body.quaternion);

const wallWest = createWall(new CANNON.Vec3(-200, 100, 0), 'black', 100);
wallWest.mesh.quaternion.copy(wallWest.body.quaternion);

let spheres =[];

function createSphere(radius, position, life) {
    const r = Math.random() * radius // m
    const sphereBody = new CANNON.Body({
        mass: 50, // kg
        shape: new CANNON.Sphere(r),
    })
    sphereBody.position.set(position.x, position.y, position.z) // m
    world.addBody(sphereBody)
    
    const geometry = new THREE.SphereGeometry(r)
    const material = new THREE.MeshNormalMaterial()
    const sphereMesh = new THREE.Mesh(geometry, material)
    sphereMesh.userData.isSphere = true; 
    scene.add(sphereMesh)

    spheres.push({ body: sphereBody, mesh: sphereMesh, life: life });
}

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    for (let i = 0; i < intersects.length; i++) {
        const intersectedObject = intersects[i].object;

        if (intersectedObject.userData.isSphere) {
            console.log('Sphere clicked');
            const sphere = spheres.find(s => s.mesh === intersectedObject);
            if (sphere) {
                const direction = new CANNON.Vec3(
                    100000, 0, 10000
                );

                direction.normalize();
                direction.scale(10, direction); // Adjust the scale factor as needed

                sphere.body.applyImpulse(direction, sphere.body.position);
            }
        }
    }
}

function clickSphere() {
    createSphere(50, { x:0, y:50, z:0 }, 500);
}

document.addEventListener('click', onMouseClick, false);
document.addEventListener('click', clickSphere, false);


// Light
let light = new THREE.DirectionalLight(0xFFFFFF, 1.0);
light.position.set(0, 10, 0);
light.target.position.set(0, 0, 0);
scene.add(light);
light.castShadow = true;
light.shadow.bias = -0.001;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.camera.near = 50;
light.shadow.camera.far = 150;
light.shadow.camera.left = 100;
light.shadow.camera.right = -100;
light.shadow.camera.top = 100;
light.shadow.camera.bottom = -100;

// Create a camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 50, 0);
camera.lookAt(0, 0, 0);

// Create a renderer
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

// Animation loop
function animate() {

    createSphere(5, { x:Math.random() * 200 - 100, y:Math.random() * 5 + 100, z:Math.random() * 200 - 100 }, 10000);
    
    requestAnimationFrame(animate)

    // Run the simulation independently of framerate every 1 / 60 ms
    world.fixedStep()

    for(let sphere of spheres) {
        sphere.mesh.position.copy(sphere.body.position)
        sphere.mesh.quaternion.copy(sphere.body.quaternion)

        sphere.life -= 1;
        if(sphere.life <= 0) {
            scene.remove(sphere.mesh);
            world.removeBody(sphere.body);
            spheres = spheres.filter(s => s !== sphere);
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

// Start the simulation loop
animate()
// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});