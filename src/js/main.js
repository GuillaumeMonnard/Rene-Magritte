import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { gsap } from "gsap";
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
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// ─── Lights ──────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 50); // couleur, intensité
spotLight.position.set(0, 0, -30); // à ajuster
spotLight.target.position.set(-1, -2, -38); // pointe vers là
spotLight.angle = Math.PI / 6; // ouverture du cône (30°)
spotLight.penumbra = 0.3; // douceur des bords
spotLight.decay = 2;
spotLight.distance = 30;

scene.add(spotLight);
scene.add(spotLight.target);
//TARGET pour trouver où est la light
// const spotHelper = new THREE.SpotLightHelper(spotLight);
// scene.add(spotHelper);

// ─── HDRI ────────────────────────────────────────────────────────────────────
const rgbeLoader = new RGBELoader();
rgbeLoader.load(urlHdri, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = 0.1;
  scene.background = texture;
  scene.backgroundIntensity = 0.1;
});

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 0.7, 0);
scene.add(camera);

// ─── Post-processing (Bloom) ─────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.6, 0.5, 0.3);
composer.addPass(bloomPass);

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

  // Log des positions après recentrage
  sceneRoot.traverse((child) => {
    if (child.isMesh) {
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);
      console.log(child.name, worldPos);
    }
  });

  console.log("Scène chargée");
});

//Raycaster
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

//Tracking des objets

let hoveredObject = null;

window.addEventListener("mousemove", (e) => {
  if (!sceneRoot) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(sceneRoot.children, true);

  if (intersects.length > 0) {
    const object = intersects[0].object;

    //Si on survole un nouvel objet
    if (hoveredObject !== object) {
      //reset de l'ancien
      if (hoveredObject) {
        hoveredObject.material.emissive.set(0x000000);
      }
      //active le nouveau
      hoveredObject = object;
      hoveredObject.material.emissive.set(0x444444);
      document.body.style.cursor = "pointer";
    }
  } else {
    //Plus rien survolé
    if (hoveredObject) {
      hoveredObject.material.emissive.set(0x000000);
      hoveredObject = null;
    }
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
