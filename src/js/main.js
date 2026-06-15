import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import { gsap } from "gsap";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SSAOPass } from "three/examples/jsm/postprocessing/SSAOPass.js";
import { SMAAPass } from "three/examples/jsm/postprocessing/SMAAPass.js";

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
renderer.shadowMap.enabled = true;
// renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.type = THREE.BasicShadowMap;

document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6aabcc);
scene.fog = new THREE.FogExp2(0x6aabcc, 0.012);

// ─── Lights ──────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xfff5e0, 0.4);
scene.add(ambientLight);

const shadowLight = new THREE.DirectionalLight(0xfff5e0, 1.5);
shadowLight.position.set(3, 12, 5);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.width = 2048;
shadowLight.shadow.mapSize.height = 2048;
shadowLight.shadow.camera.near = 0.1;
shadowLight.shadow.camera.far = 60;
shadowLight.shadow.camera.left = -20;
shadowLight.shadow.camera.right = 20;
shadowLight.shadow.camera.top = 20;
shadowLight.shadow.camera.bottom = -20;
scene.add(shadowLight);
scene.add(shadowLight.target);

const fillLight = new THREE.DirectionalLight(0xaac8ff, 0.4);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

// ─── HDRI ────────────────────────────────────────────────────────────────────
const rgbeLoader = new RGBELoader();
rgbeLoader.load(urlHdri, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = 0.7;
});

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0, 0.7, 0);
scene.add(camera);

// ─── Post-processing ─────────────────────────────────────────────────────────
const renderTarget = new THREE.WebGLRenderTarget(w, h, {
  type: THREE.HalfFloatType,
});
const composer = new EffectComposer(renderer, renderTarget);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.1, 0.5, 0.3);
composer.addPass(bloomPass);

const outlinePass = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
outlinePass.edgeStrength = 3;
outlinePass.edgeGlow = 0;
outlinePass.edgeThickness = 1;
outlinePass.visibleEdgeColor.set(0xffffff);
outlinePass.hiddenEdgeColor.set(0x000000);
composer.addPass(outlinePass);
// ─── Chargement de la scène ───────────────────────────────────────────────────
const gltfLoader = new GLTFLoader();
let sceneRoot = null;

gltfLoader.load(urlScene, (gltf) => {
  sceneRoot = gltf.scene;

  sceneRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material?.emissive?.getHex() !== 0x000000) {
      child.material.emissiveIntensity = 2.0;
    }
  });

  sceneRoot.getObjectByName("NUAGE")?.traverse((child) => {
    if (child.isMesh) {
      child.material.color.set(0x6aabcc); // même bleu que le fond
      child.material.roughness = 1;
      child.material.metalness = 0;
    }
  });

  const box = new THREE.Box3().setFromObject(sceneRoot);
  const center = box.getCenter(new THREE.Vector3());
  console.log("Centre:", center);
  console.log("Box min:", box.min, "max:", box.max);

  sceneRoot.position.sub(center);
  scene.add(sceneRoot);

  console.log("Scène chargée");
});

// ─── Raycaster ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ─── Objets non interactifs ───────────────────────────────────────────────────
const nonInteractable = [
  "NUAGE",
  "Plane014",
  "couloir",
  "TABLEAU",
  "light",
  "PORTE-MANTEAUX",
];

// ─── Données des objets ───────────────────────────────────────────────────────
const objectData = {
  OISEAU: {
    title: "L'oiseau",
    text: "On pense à la liberté, au ciel, au mouvement.\n\nMais chez Magritte, il n'est pas toujours en vol. Parfois il est figé, étrange, hors de son contexte.\n\nIl n'est plus seulement un symbole de liberté: il devient une forme, une idée, une présence déroutante.",
  },
  CAGE: {
    title: "La cage",
    text: "On pense à la prison, à la contrainte.\n\nMais chez Magritte, elle n'est pas toujours fermée. Parfois elle semble fragile, irréelle, presque imaginaire.\n\nElle ne retient pas seulement un corps: elle montre surtout l'idée même de limite.",
  },
  PORTE: {
    title: "La porte",
    text: "Une porte devrait ouvrir sur une autre pièce, sur quelque chose de réel, de concret.\n\nMais chez René Magritte, elle peut s'ouvrir sur... un ciel, une mer, un paysage impossible. Ce n'est plus un passage, c'est une illusion.\n\nLa porte n'emmène nulle part.\n\nElle remet en doute ce que vous pensiez solide: les murs, l'espace, la réalité elle-même.",
  },
  PIPE: {
    title: "La pipe",
    text: "Vous voyez une pipe. Votre cerveau le sait immédiatement.\n\nEt pourtant, Magritte écrit: 'ceci n'est pas une pipe'.\n\nPourquoi? Parce que ce n'est pas une vraie pipe.\n\nC'est seulement son image. Vous ne pouvez pas la toucher, ni la remplir, ni la fumer. Magritte vous montre une chose simple: une image n'est pas la réalité.",
  },
  POMME: {
    title: "La pomme",
    text: "Un homme se tient face à vous. Costume, chapeau melon... tout semble normal.\n\nSauf une chose: une pomme flotte devant son visage.\n\nDans cette oeuvre, ce détail change tout. La pomme empêche de voir l'essentiel: l'identité de l'homme.\n\nMagritte joue avec votre regard. Vous voyez l'objet, mais vous cherchez ce qui est caché derrière.\n\nC'est là l'idée: nous ne voyons jamais complètement la réalité. Quelque chose nous échappe toujours.",
  },
  TABLE: {
    title: "La table",
    text: "Une table, au centre d'une pièce. Stable, solide, familière.\n\nMais chez Magritte, rien n'est totalement sûr.\n\nParfois elle flotte, parfois elle se transforme.\n\nElle perd sa fonction, son utilité, sa logique.\n\nCe qui devrait soutenir le monde… devient instable.\n\nLa table n'est plus un objet banal : elle montre que nos repères peuvent basculer à tout moment.",
  },
  CHEVALET: {
    title: "Le chevalet",
    text: "Un paysage devant vous. Et le même… peint sur une toile. Impossible de voir la différence.\n\nChez René Magritte, le tableau ne montre pas le monde. Il le remplace. La toile cache ce qui est derrière elle, tout en prétendant le révéler.\n\nAlors une question apparaît : regardez-vous la réalité… ou seulement une image ?",
  },
  CHAPEAU: {
    title: "Le chapeau melon",
    text: "Un homme en costume. Un visage presque invisible. Et toujours ce chapeau melon.\n\nChez René Magritte, ce n'est pas un simple accessoire.\n\nC'est un symbole de l'homme ordinaire. En le répétant encore et encore, il efface les différences. Ces hommes se ressemblent tous. Ils pourraient être n'importe qui. Peut-être même vous.\n\nLe chapeau ne cache pas le visage… mais il masque quelque chose de plus profond : l'identité.",
  },
  MANTEAU: {
    title: "Le manteau",
    text: "Debout, comme porté par quelqu'un. Mais il n'y a personne.\n\nChez René Magritte, le vêtement remplace l'homme. Il garde la forme… mais pas la présence. Ce n'est plus une protection. C'est une façade. Le corps disparaît, et il ne reste qu'une apparence.",
  },
  DRAPS: {
    title: "Les draps",
    text: "Deux personnes s'embrassent. Un moment intime, simple.\n\nMais leurs visages sont cachés sous un tissu.\n\nChez René Magritte, ce drap change tout. Il empêche le contact réel.\n\nIls sont proches… mais séparés.\n\nLe tissu devient une barrière invisible : on peut aimer quelqu'un, sans jamais vraiment le connaître.",
  },
  MIROIR: {
    title: "Le miroir",
    text: "Mais il ne révèle pas toujours ce que l'on attend.\n\nChez Magritte, le reflet cesse d'être une preuve. Il devient un mystère.\n\nCe que l'on voit n'est pas forcément la vérité. Et ce qui nous échappe est parfois plus important que ce qui apparaît.\n\nLe miroir ne montre pas seulement une image.\n\nIl interroge le regard. Car se voir n'est pas toujours se connaître.\n\nEt derrière chaque reflet demeure une question : sommes-nous ce que nous montrons, ou ce qui reste invisible ?",
  },
  CANNE: {
    title: "La canne",
    text: "Un simple bâton de marche. Fait pour aider, pour soutenir.\n\nMais chez Magritte, il n'est jamais seulement utile.\n\nParfois il semble vivant, étrange, presque inquiétant.\n\nComme si l'objet dépassait sa fonction.\n\nLa canne n'est plus juste un support : elle montre que les objets du quotidien peuvent cacher un mystère.",
  },
  FENETRE: {
    title: "La fenêtre",
    text: "Une fenêtre ouverte sur l'extérieur. On s'attend à voir le monde.\n\nMais chez Magritte, ce n'est jamais si simple.\n\nParfois, on voit une image à la place du réel.\n\nParfois, la fenêtre devient elle-même ce qu'elle encadre. Elle ne sépare plus : elle trompe le regard.\n\nLa fenêtre montre une idée essentielle : voir n'est pas toujours comprendre.",
  },
  RIDEAUX: {
    title: "Les rideaux",
    text: "Des rideaux fermés devant une fenêtre. On pense qu'ils cachent simplement la vue.\n\nMais chez Magritte, ils deviennent autre chose.\n\nParfois ils semblent lourds, presque vivants.\n\nComme s'ils empêchaient plus que la lumière d'entrer. Les rideaux ne protègent plus seulement : ils rappellent que ce qu'on ne voit pas existe aussi dans l'image.",
  },
  NUAGE: {
    title: "Les nuages",
    text: "Des nuages dans le ciel. On les imagine légers, naturels, changeants.\n\nMais chez Magritte, ils deviennent autre chose. Ils apparaissent dans des lieux impossibles, à l'intérieur des objets.\n\nIls ne sont plus seulement dans le ciel : ils montrent que le réel peut se déplacer et se transformer.",
  },
  PINCEAUX: { title: "Les pinceaux", text: "hihi" },
};

// ─── UI ───────────────────────────────────────────────────────────────────────
const infoPanel = document.getElementById("info-panel");
const infoTitle = document.getElementById("info-title");
const infoText = document.getElementById("info-text");
const backBtn = document.getElementById("back-button");

// ─── Scroll ───────────────────────────────────────────────────────────────────
document.body.style.height = "600vh";

camera.position.set(0, 0.7, 0);
camera.rotation.x = 0;

gsap.to(camera.position, {
  z: -34,
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
  y: 0,
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
let lookAtTarget = null;
let isZoomed = false;
let savedCameraPos = null;
let savedCameraRot = null;

function getTopObject(hit) {
  let object = hit;
  while (object.parent && object.parent !== sceneRoot) {
    object = object.parent;
  }
  return object;
}

window.addEventListener("mousemove", (e) => {
  if (!sceneRoot || isZoomed) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(sceneRoot.children, true);

  if (intersects.length > 0) {
    const object = getTopObject(intersects[0].object);

    if (nonInteractable.includes(object.name)) {
      hoveredObject = null;
      outlinePass.selectedObjects = [];
      document.body.style.cursor = "default";
      return;
    }

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

// ─── Clic sur un objet ────────────────────────────────────────────────────────
window.addEventListener("click", (e) => {
  if (e.target.closest("#back-button")) return;
  if (!hoveredObject || isZoomed) return;

  isZoomed = true;

  savedCameraPos = camera.position.clone();
  savedCameraRot = camera.rotation.clone();

  const box = new THREE.Box3().setFromObject(hoveredObject);
  const targetPos = new THREE.Vector3();
  box.getCenter(targetPos);

  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  const fov = camera.fov * (Math.PI / 180);
  const distance = (maxDim / 2 / Math.tan(fov / 2)) * 1.6;
  const fovY = camera.fov * (Math.PI / 180);
  const fovX = 2 * Math.atan(Math.tan(fovY / 2) * camera.aspect);
  const screenOffset = 0.4;
  const worldOffset = screenOffset * distance * Math.tan(fovX / 2);

  const lookOffset = new THREE.Vector3(
    targetPos.x - worldOffset,
    targetPos.y,
    targetPos.z,
  );

  const zoomPos = new THREE.Vector3(
    targetPos.x - worldOffset,
    targetPos.y,
    targetPos.z + distance,
  );

  // Calcule la rotation cible via une caméra temporaire
  const tempCam = camera.clone();
  tempCam.position.copy(zoomPos);
  tempCam.lookAt(lookOffset);
  const targetRot = tempCam.rotation.clone();

  ScrollTrigger.getAll().forEach((st) => st.disable(false));

  gsap.to(camera.position, {
    x: zoomPos.x,
    y: zoomPos.y,
    z: zoomPos.z,
    duration: 1.2,
    ease: "power2.inOut",
    overwrite: true,
  });

  gsap.to(camera.rotation, {
    x: targetRot.x,
    y: targetRot.y,
    z: targetRot.z,
    duration: 1.2,
    ease: "power2.inOut",
    overwrite: true,
    onComplete: () => {
      lookAtTarget = lookOffset.clone();

      const data = objectData[hoveredObject.name];
      if (data) {
        infoTitle.innerText = data.title;
        infoText.innerText = data.text;
      } else {
        infoTitle.innerText = hoveredObject.name;
        infoText.innerText = "";
      }
      infoPanel.classList.add("visible");
      document.body.style.cursor = "default";
    },
  });
});

// ─── Bouton retour ────────────────────────────────────────────────────────────
backBtn.addEventListener("click", () => {
  isZoomed = false;
  lookAtTarget = null;
  outlinePass.selectedObjects = [];
  infoPanel.classList.remove("visible");

  const currentPos = camera.position.clone();
  const currentRotX = camera.rotation.x;
  const currentRotY = camera.rotation.y;
  const currentRotZ = camera.rotation.z;

  ScrollTrigger.getAll().forEach((st) => st.enable());
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(camera.rotation);

  camera.position.copy(currentPos);
  camera.rotation.set(currentRotX, currentRotY, currentRotZ);

  gsap.to(camera.position, {
    x: savedCameraPos.x,
    y: savedCameraPos.y,
    z: savedCameraPos.z,
    duration: 1.2,
    ease: "power2.inOut",
  });

  gsap.to(camera.rotation, {
    x: savedCameraRot.x,
    y: savedCameraRot.y,
    z: savedCameraRot.z,
    duration: 1.2,
    ease: "power2.inOut",
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

// ─── About ───────────────────────────────────────────────────────────────────
const aboutPanel = document.getElementById("about-panel");
const aboutClose = document.getElementById("about-close");

document.querySelector(".hat-icon").addEventListener("click", () => {
  aboutPanel.classList.add("visible");
});

aboutClose.addEventListener("click", () => {
  aboutPanel.classList.remove("visible");
});

// ─── Render loop ─────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (lookAtTarget) camera.lookAt(lookAtTarget);

  renderer.render(scene, camera);
  composer.render();
}

animate();
