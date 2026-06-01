import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { gsap } from "gsap";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import urlScene from "../assets/3d-model/scene.glb";
import urlHdri from "../assets/hdri/hdri.hdr";

gsap.registerPlugin(ScrollTrigger);

// ─── Renderer ────────────────────────────────────────────────────────────────
const w = window.innerWidth;
const h = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ─── Lights ──────────────────────────────────────────────────────────────────
scene.background = new THREE.Color(0x6aabcc);
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 110);
spotLight.position.set(0, 0, -30);
spotLight.target.position.set(-1, -2, -38);
spotLight.angle = Math.PI / 6;
spotLight.penumbra = 1;
spotLight.decay = 2;
spotLight.distance = 50;
scene.add(spotLight);
scene.add(spotLight.target);

const spotHelper = new THREE.SpotLightHelper(spotLight);
scene.add(spotHelper);

const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(0, 0, -40);
scene.add(dirLight);

// ─── HDRI ────────────────────────────────────────────────────────────────────
const rgbeLoader = new RGBELoader();
rgbeLoader.load(urlHdri, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = 0.2;
});

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 0.7, 0);
scene.add(camera);

// ─── Post-processing ─────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.5, 0.7);
composer.addPass(bloomPass);

const outlinePass = new OutlinePass(new THREE.Vector2(w, h), scene, camera); // ← plus de double l
outlinePass.edgeStrength = 3; // ← minuscule
outlinePass.edgeGlow = 0;
outlinePass.edgeThickness = 1;
outlinePass.visibleEdgeColor.set(0xffffff);
outlinePass.hiddenEdgeColor.set(0x000000); // ← 6 zéros
composer.addPass(outlinePass);

// ─── Chargement de la scène ───────────────────────────────────────────────────
const gltfLoader = new GLTFLoader();
let sceneRoot = null;
gltfLoader.load(urlScene, (gltf) => {
  sceneRoot = gltf.scene;
  sceneRoot.traverse((child) => {
    if (!child.isMesh) return;
    if (child.material?.emissive?.getHex() !== 0x000000) {
      child.material.emissiveIntensity = 2.0;
    }
  });

  const box = new THREE.Box3().setFromObject(sceneRoot);
  const center = box.getCenter(new THREE.Vector3());
  sceneRoot.position.sub(center);

  scene.add(sceneRoot);

  sceneRoot.traverse((child) => {
    if (child.isMesh) {
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);
      console.log(child.name, worldPos);
    }
  });

  console.log("Scène chargée");
});

// ─── Raycaster ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ─── Scroll ───────────────────────────────────────────────────────────────────
document.body.style.height = "600vh";

camera.position.set(0, 0.7, 0);
camera.rotation.x = 0;

gsap.to(camera.position, {
  z: -35,
  ease: "power2.inOut",
  scrollTrigger: {
    trigger: document.body,
    start: "top top",
    end: "80% bottom",
    scrub: 1.2,
  },
});

gsap.to(camera.rotation, {
  x: -Math.PI / 9,
  ease: "power2.inOut",
  scrollTrigger: {
    trigger: document.body,
    start: "10% top",
    end: "bottom bottom",
    scrub: 1.2,
  },
});

gsap.to(camera.position, {
  y: -0.5,
  ease: "power2.inOut",
  scrollTrigger: {
    trigger: document.body,
    start: "10% top",
    end: "bottom bottom",
    scrub: 1.2,
  },
});

// ─── Tracking des objets ──────────────────────────────────────────────────────
let hoveredObject = null;

window.addEventListener("mousemove", (e) => {
  if (!sceneRoot) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(sceneRoot.children, true);

  if (intersects.length > 0) {
    const object = intersects[0].object;
    if (hoveredObject !== object) {
      hoveredObject = object;
      outlinePass.selectedObjects = [object];
      document.body.style.cursor = "pointer";
    }
  } else {
    hoveredObject = null;
    outlinePass.selectedObjects = [];
    document.body.style.cursor = "default";
  }
});

// ─── Resize ──────────────────────────────────────────────────────────────────
window.addEventListener("resize", () => {
  const newW = window.innerWidth;
  const newH = window.innerHeight;

  camera.aspect = newW / newH;
  camera.updateProjectionMatrix();

  renderer.setSize(newW, newH);
  composer.setSize(newW, newH);
});

// ─── Render loop ─────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  composer.render();
}

animate();
