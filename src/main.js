import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { DXFLibLoader } from "./loaders/dxfLib3D.js";

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

let canvas = document.getElementById("viewer");

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color("#fdfff5");

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

const light = new THREE.AmbientLight(0x404040, 10);
scene.add(light);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight
);
camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.5, 0);
controls.update();
controls.enablePan = false;
controls.enableDamping = true;

document.body.appendChild(renderer.domElement);
renderer.render(scene, camera);

//const loader = new DXFLibLoader();
//loader.parseDxf("/public/models/cube.dxf");

const loader = new DXFLibLoader();
loader.load(
  "/public/models/model.dxf",
  (model) => {
    console.log("loaded");
    console.log(model.entities);
    model.entities.forEach((entity) => {
      scene.add(entity);
    });
    renderer.render(scene, camera);
  },
  () => {
    console.log("loading...");
  },
  (e) => {
    console.log(e);
  }
);

animate();
