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
scene.background = new THREE.Color(0x6aabcc);

// ─── Lights ──────────────────────────────────────────────────────────────────
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
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0, 0.7, 0);
scene.add(camera);

// ─── Post-processing ─────────────────────────────────────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.3, 0.5, 0.7);
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
    if (child.material?.emissive?.getHex() !== 0x000000) {
      child.material.emissiveIntensity = 2.0;
    }
  });

  const box = new THREE.Box3().setFromObject(sceneRoot);
  const center = box.getCenter(new THREE.Vector3());
  sceneRoot.position.sub(center);

  scene.add(sceneRoot);
  console.log("Scène chargée");
});

// ─── Raycaster ───────────────────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// ─── Données des objets ───────────────────────────────────────────────────────
const objectData = {
  OISEAU: {
    title: "L'oiseau",
    text: "On pense à la liberté, au ciel, ou mouvement.\n\nMais chez Magritte, il n'est pas toujours en vol.\n\nParfois il est figé, étrange, hors de son contexte.\n\nIl n'est plus eulement un symbole de liberté: il devient une forme, une idée, une présence déroutante.",
  },
  CAGE: {
    title: "La cage",
    text: "Une cage.\n\nOn pense à la prison, à la contrainte.\n\nMais chez Magritte, elle n'est pas toujours fermée.\n\nParfois elle semble fragile, irréelle, presque imaginaire.\n\nElle ne retient pas seulement un corps: elle montre surtout l'idée même de limite.",
  },
  PORTE: {
    title: "La porte",
    text: "Une porte devrait ouvrir sur une autre pièce, sur quelque chose de réel, de concret.\n\nMais chez René Magritte, elle peut s'ouvrir sur... un ciel, une mer, un paysage impossible.\n\nCe n'est plus un passage, c'est une illusion.\n\nLa porte n emène nulle part.\n\nElle remet en doute ce que vous pensiez solide: les murs, l'espace, la réalité elle-même.",
  },
  PIPE: {
    title: "La pipe",
    text: "Vous voyez une pipe.\n\nVotre cerveau le sait immédiatement.\n\nEt pourant, Magritte écrit: 'ceci n'est pas une pipe'.\n\nPourquoi? Parce que ce n'est pas uen vraie pipe.\n\nC'est seulement son image.\n\nVous ne pouvez pas la toucher, ni la remplir, ni la fumer.\n\nMagritte vous montre une chose simple: une imagen n'est pas la réalité.",
  },
  POMME: {
    title: "La pomme",
    text: "Une homme se tient face à vous. Costume, chapeau melon, ... tout semble normal.\n\nSauf une chose: une pomme flotte devant son visage. Dans cette oeuvre, ce détail chagne tout.\n\nLa pomme empêche de voir l'essentiel: l'identité de l'homme.\n\nMagritte joue avec votre regard.\n\nVous voyez l'objet, mais vous cherchez ce qui est caché derrière.\n\nC'est là l'idée: nous ne voyons jamais complètement la réalité.\n\nQuelque chose nous échappe toujours.",
  },
  TABLE: {
    title: "La table",
    text: "Une table, au centre d'une pièce.\n\nStable, solide, familière.\n\nMais chez Magritte, rien n'est totalement sûr.\n\nParfois elle flotte, parfois elle se transforme.\n\nElle perd sa fonction, son utilité, sa logique.\n\nCe qui devrait soutenir le monde… devient instable. La table n'est plus un objet banal : elle montre que nos repères peuvent basculer à tout moment.",
  },
  CHEVALET: {
    title: "Le chevalet",
    text: "Un paysage devant vous.\n\nEt le même… peint sur une toile.\n\nImpossible de voir la différence.\n\nChez René Magritte, le tableau ne montre pas le monde.\n\nIl le remplace.\n\nLa toile cache ce qui est derrière elle, tout en prétendant le révéler.\n\nAlors une question apparaît : regardez-vous la réalité… ou seulement une image ?",
  },
  CHAPEAU: {
    title: "Le chapeau melon",
    text: "Un homme en costume. Un visage presque invisible. Et toujours ce chapeau melon. Chez René Magritte, ce n'est pas un simple accessoire. C'est un symbole de l'homme ordinaire. En le répétant encore et encore, il efface les différences. Ces hommes se ressemblent tous. Ils pourraient être n'importe qui. Peut-être même vous. Le chapeau ne cache pas le visage… mais il masque quelque chose de plus profond : l'identité.",
  },
  MANTEAU: {
    title: "Le manteau",
    text: "Debout, comme porté par quelqu'un. Mais il n'y a personne. Chez René Magritte, le vêtement remplace l'homme. Il garde la forme… mais pas la présence. Ce n'est plus une protection. C'est une façade. Le corps disparaît, et il ne reste qu'une apparence.",
  },
  DRAPS: {
    title: "Les draps",
    text: "Deux personnes s'embrassent. Un moment intime, simple. Mais leurs visages sont cachés sous un tissu. Chez René Magritte, ce drap change tout. Il empêche le contact réel. Ils sont proches… mais séparés. Le tissu devient une barrière invisible : on peut aimer quelqu'un, sans jamais vraiment le connaître.",
  },
  MIROIR: {
    title: "Le miroir",
    text: "Mais il ne révèle pas toujours ce que l'on attend.\n\nChez Magritte, le reflet cesse d'être une preuve.\n\nIl devient un mystère.\n\nCe que l'on voit n'est pas forcément la vérité.\n\nEt ce qui nous échappe est parfois plus important que ce qui apparaît. Le miroir ne montre pas seulement une image.\n\nIl interroge le regard. Car se voir n'est pas toujours se connaître.\n\nEt derrière chaque reflet demeure une question : sommes-nous ce que nous montrons, ou ce qui reste invisible ?",
  },
  CANNE: {
    title: "La cane",
    text: "Un simple bâton de marche.\n\nFait pour aider, pour soutenir.\n\nMais chez Magritte, il n'est jamais seulement utile.\n\nParfois il semble vivant, étrange, presque inquiétant.\n\nComme si l'objet dépassait sa fonction.\n\nLa canne n'est plus juste un support : elle montre que les objets du quotidien peuvent cacher un mystère.",
  },
  FENÊTRE: {
    title: "La fenêtre",
    text: "Une fenêtre ouverte sur l'extérieur.\n\nOn s'attend à voir le monde.\n\nMais chez Magritte, ce n'est jamais si simple.\n\nParfois, on voit une image à la place du réel.\n\nParfois, la fenêtre devient elle-même ce qu'elle encadre.\n\nElle ne sépare plus : elle trompe le regard.\n\nLa fenêtre montre une idée essentielle : voir n'est pas toujours comprendre.",
  },
  RIDEAUX: {
    title: "Les rideaux",
    text: "Des rideaux fermés devant une fenêtre.\n\nOn pense qu'ils cachent simplement la vue.\n\nMais chez Magritte, ils deviennent autre chose.\n\nParfois ils semblent lourds, presque vivants.\n\nComme s'ils empêchaient plus que la lumière d'entrer. Les rideaux ne protègent plus seulement : ils rappellent que ce qu'on ne voit pas existe aussi dans l'image.",
  },
  NUAGE: {
    title: "Les nuages",
    text: "Des nuages dans le ciel.\n\nOn les imagine légers, naturels, changeants.\n\nMais chez Magritte, ils deviennent autre chose.\n\nIls apparaissent dans des lieux impossibles, à l'intérieur des objets.\n\nIls ne sont plus seulement dans le ciel : ils montrent que le réel peut se déplacer et se transformer.",
  },
  PINCEAUX: { title: "Les pinceaux", text: "lorem ipsum et tout et tout" },
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

// Position sauvegardée avant le zoom
let savedCameraPos = null;
let savedCameraRot = null;

window.addEventListener("mousemove", (e) => {
  if (!sceneRoot || isZoomed) return;
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

// ─── Clic sur un objet ────────────────────────────────────────────────────────
window.addEventListener("click", (e) => {
  // Ignore si c'est le bouton retour
  if (e.target.closest("#back-button")) return;
  if (!hoveredObject || isZoomed) return;

  isZoomed = true;

  // Sauvegarde la position actuelle de la caméra
  savedCameraPos = camera.position.clone();
  savedCameraRot = camera.rotation.clone();

  const box = new THREE.Box3().setFromObject(hoveredObject);
  const targetPos = new THREE.Vector3();
  box.getCenter(targetPos);

  const zoomPos = new THREE.Vector3(
    targetPos.x,
    targetPos.y + 0.5,
    targetPos.z + 2,
  );

  ScrollTrigger.getAll().forEach((st) => st.disable(false));
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(camera.rotation);

  gsap.to(camera.position, {
    x: zoomPos.x,
    y: zoomPos.y,
    z: zoomPos.z,
    duration: 1.2,
    ease: "power2.inOut",
    onUpdate: () => camera.lookAt(targetPos),
    onComplete: () => {
      lookAtTarget = targetPos.clone();

      const data = objectData[hoveredObject.name];
      if (data) {
        infoTitle.innerText = data.title;
        infoText.innerText = data.text;
      } else {
        infoTitle.innerText = hoveredObject.name;
        infoText.innerText = "";
      }
      infoPanel.classList.add("visible");
    },
  });
});

// ─── Bouton retour ────────────────────────────────────────────────────────────
backBtn.addEventListener("click", () => {
  console.log("retour cliqulé");
  isZoomed = false;
  lookAtTarget = null;
  outlinePass.selectedObjects = [];
  infoPanel.classList.remove("visible");

  ScrollTrigger.getAll().forEach((st) => st.enable());
  gsap.killTweensOf(camera.position);
  gsap.killTweensOf(camera.rotation);

  // Restaure la position sauvegardée
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

// ─── Render loop ─────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  if (lookAtTarget) camera.lookAt(lookAtTarget);
  composer.render();
}

animate();
