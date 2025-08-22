import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DXFLibLoader } from "./loaders/dxfLib3D.js";

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
}

function focusOnObject(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const distance = Math.max(size.x, size.y, size.z);

  camera.position.set(
    center.x + distance,
    center.y + distance,
    center.z + distance
  );

  controls.target.copy(center);
  controls.update();
}

let canvas = document.getElementById("viewer");

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight
);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableDamping = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#fdfff5");

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const ambientLight = new THREE.AmbientLight(0x404040, 10);
scene.add(ambientLight);

const loader = new DXFLibLoader();
loader.load(
  "/public/models/cubeColored.dxf",
  (result) => {
    console.log("loaded");
    scene.add(result.model);
    focusOnObject(result.model);
  },
  () => {
    console.log("loading...");
  },
  (e) => {
    console.log(e);
  }
);

animate();
