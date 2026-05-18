import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import urlCouloir from "../assets/3d-model/COULOIR.glb";
import urlAtelier from "../assets/3d-model/ATELIER.glb";
import urlLightmap from "../assets/lightmaps/lightmap.png";
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambientLight);

// ─── HDRI ────────────────────────────────────────────────────────────────────
const rgbeLoader = new RGBELoader();
rgbeLoader.load(urlHdri, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = 0.05;
});

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 0.2, 0);
scene.add(camera);

// ─── Post-processing (Bloom) ─────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(w, h),
  0.6, // strength
  0.5, // radius
  0.3, // threshold
);
composer.addPass(bloomPass);

// ─── Lightmap (scène 1 uniquement) ───────────────────────────────────────────
const textureLoader = new THREE.TextureLoader();
const lightmap = textureLoader.load(urlLightmap);
lightmap.channel = 1;
lightmap.colorSpace = THREE.SRGBColorSpace;
lightmap.flipY = false;

// ─── Fonction utilitaire ──────────────────────────────────────────────────────
function applyLightmap(root, lm) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.material.lightMap = lm;
    child.material.lightMapIntensity = 1.0;
    if (child.material?.emissive?.getHex() !== 0x000000) {
      child.material.emissiveIntensity = 2.0;
    }
  });
}

// ─── Chargement des modèles ───────────────────────────────────────────────────
let scene1Root = null;
let scene2Root = null;

const gltfLoader = new GLTFLoader();

gltfLoader.load(urlCouloir, (gltf) => {
  scene1Root = gltf.scene;
  applyLightmap(scene1Root, lightmap);

  const box = new THREE.Box3().setFromObject(scene1Root);
  const center = box.getCenter(new THREE.Vector3());
  scene1Root.position.sub(center);

  scene.add(scene1Root);
  console.log("✅ Scène 1 chargée");
});

gltfLoader.load(urlAtelier, (gltf) => {
  scene2Root = gltf.scene;

  // Pas de lightmap pour la scène 2 pour l'instant
  scene2Root.traverse((child) => {
    if (!child.isMesh) return;
    if (child.material?.emissive?.getHex() !== 0x000000) {
      child.material.emissiveIntensity = 2.0;
    }
  });

  const box = new THREE.Box3().setFromObject(scene2Root);
  const center = box.getCenter(new THREE.Vector3());
  scene2Root.position.sub(center);

  console.log("✅ Scène 2 prête");
});

// ─── Overlay fade ─────────────────────────────────────────────────────────────
const overlay = document.createElement("div");
overlay.style.cssText = `
  position: fixed;
  inset: 0;
  background: black;
  opacity: 0;
  pointer-events: none;
  z-index: 10;
`;
document.body.appendChild(overlay);

// ─── Scroll ───────────────────────────────────────────────────────────────────
document.body.style.height = "600vh";

const direction = new THREE.Vector3(0, 0, -1);

// Mouvement caméra — scène 1
const camProgress1 = { value: 0 };
gsap.to(camProgress1, {
  value: 50,
  ease: "none",
  scrollTrigger: {
    trigger: document.body,
    start: "top top",
    end: "50% bottom",
    scrub: 1.2,
  },
  onUpdate: () => {
    camera.position.z = direction.z * camProgress1.value;
    camera.position.y = 0.2;
  },
});

// 👍 Transition scène 1 → scène 2
let transitionDone = false;
ScrollTrigger.create({
  trigger: document.body,
  start: "49% top",
  onEnter: () => {
    if (transitionDone || !scene2Root) return;
    transitionDone = true;

    gsap.to(overlay, {
      opacity: 1,
      duration: 0.6,
      ease: "power2.inOut",
      onComplete: () => {
        if (scene1Root) scene.remove(scene1Root);
        scene.add(scene2Root);
        camera.position.set(0, 0.2, 0);

        gsap.to(overlay, {
          opacity: 0,
          duration: 0.6,
          ease: "power2.inOut",
        });
      },
    });
  },
});

// Mouvement caméra — scène 2
const camProgress2 = { value: 0 };
gsap.to(camProgress2, {
  value: 50,
  ease: "none",
  scrollTrigger: {
    trigger: document.body,
    start: "50% top",
    end: "bottom bottom",
    scrub: 1.2,
  },
  onUpdate: () => {
    camera.position.z = direction.z * camProgress2.value;
    camera.position.y = 0.2;
  },
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
