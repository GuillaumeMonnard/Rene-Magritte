import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { HDRCubeTextureLoader } from "three/examples/jsm/loaders/HDRCubeTextureLoader.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import urlCouloir from "../assets/3d-model/COULOIR.glb";
import urlLightmap from "../assets/lightmaps/lightmap.png";

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
scene.background = new THREE.Color(0x222222);

// ─── Lights ──────────────────────────────────────────────────────────────────
// Très bas — l'éclairage vient de la lightmap
const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
scene.add(ambientLight);

const rgbeLoader = new RGBELoader();
rgbeLoader.load("../assets/industrial_sunset_puresky_4k", (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = 0.3;
});

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.set(0, 0.2, 0);
scene.add(camera);

// ─── Post-processing (Bloom) ─────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// 👍 Bloom léger par-dessus la lightmap — juste pour les tubes émissifs
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(w, h),
  0.6, // strength  — léger, la lightmap fait le vrai travail
  0.5, // radius    — halo doux
  0.3, // threshold — seules les zones très lumineuses (tubes) blooment
);
composer.addPass(bloomPass);

// ─── Lightmap ────────────────────────────────────────────────────────────────
const textureLoader = new THREE.TextureLoader();
const lightmap = textureLoader.load(urlLightmap);
lightmap.channel = 1;
lightmap.colorSpace = THREE.SRGBColorSpace;
lightmap.flipY = false;

// ─── Chargement du modèle ────────────────────────────────────────────────────
const gltfLoader = new GLTFLoader();

gltfLoader.load(urlCouloir, (gltf) => {
  scene.add(gltf.scene);
  console.log("✅ Modèle chargé");

  const box = new THREE.Box3().setFromObject(gltf.scene);
  const center = box.getCenter(new THREE.Vector3());
  gltf.scene.position.sub(center);

  gltf.scene.traverse((child) => {
    if (!child.isMesh) return;

    // 👍 Lightmap sur tous les meshes
    child.material.lightMap = lightmap;
    child.material.lightMapIntensity = 1.0;

    // 👍 Tubes émissifs — renforcer pour que le bloom accroche
    if (child.material?.emissive?.getHex() !== 0x000000) {
      child.material.emissiveIntensity = 2.0;
    }

    // 👍 Normal map — décommente si le relief est inversé
    // child.material.normalScale?.set(1, -1);
  });
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

// ─── Scroll ──────────────────────────────────────────────────────────────────
document.body.style.height = "300vh";

const direction = new THREE.Vector3(0, 0, -1);
const camProgress = { value: 0 };

gsap.to(camProgress, {
  value: 30,
  ease: "none",
  scrollTrigger: {
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    scrub: 1.2,
  },
  onUpdate: () => {
    camera.position.x = direction.x * camProgress.value;
    camera.position.y = 0.2;
    camera.position.z = direction.z * camProgress.value;
  },
});

// ─── Render loop ─────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  composer.render(); // composer.render() au lieu de renderer.render()
}

animate();
