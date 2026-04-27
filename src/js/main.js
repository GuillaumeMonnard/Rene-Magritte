import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import urlCouloir from "../assets/3d-model/COULOIR.glb";

gsap.registerPlugin(ScrollTrigger);

// Renderer
const w = window.innerWidth;
const h = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x222222);

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Camera (FPS style, pas de rotation)
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 0.2, 0);
scene.add(camera);

// Load model
const gltfLoader = new GLTFLoader();

gltfLoader.load(urlCouloir, (gltf) => {
  scene.add(gltf.scene);

  console.log("✅ Modèle chargé");

  // centrer le modèle
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new THREE.Vector3());
  gltf.scene.position.sub(center);
});

// Resize
window.addEventListener("resize", () => {
  const newW = window.innerWidth;
  const newH = window.innerHeight;

  camera.aspect = newW / newH;
  camera.updateProjectionMatrix();

  renderer.setSize(newW, newH);
});

// 👉 FORCER DU SCROLL
document.body.style.height = "300vh";

// 👉 DIRECTION FIXE (tout droit dans le couloir)
const direction = new THREE.Vector3(0, 0, -1);

// 👉 PROGRESSION SCROLL → MOUVEMENT CAMERA
const camProgress = { value: 0 };

gsap.to(camProgress, {
  value: 30, // distance dans le couloir
  ease: "none",
  scrollTrigger: {
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    scrub: 1.2,
  },
  onUpdate: () => {
    camera.position.x = direction.x * camProgress.value;
    camera.position.y = 0.2; // hauteur fixe
    camera.position.z = direction.z * camProgress.value;
  },
});

// Render loop
function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

animate();
