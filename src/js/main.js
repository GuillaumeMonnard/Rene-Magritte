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
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";
import { KuwaharaShader } from "./KuwaharaShader.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

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
renderer.toneMappingExposure = 0.75;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = "0";
renderer.domElement.style.left = "0";

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(w, h);
labelRenderer.domElement.style.position = "fixed";
labelRenderer.domElement.style.top = "0";
labelRenderer.domElement.style.left = "0";
labelRenderer.domElement.style.pointerEvents = "none";
document.body.appendChild(labelRenderer.domElement);

// ─── Scene ───────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa0c8e0);
scene.fog = new THREE.FogExp2(0xa0c8e0, 0.022);

// ─── Lights ──────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xfff5e0, 0.6);
scene.add(ambientLight);

const shadowLight = new THREE.DirectionalLight(0xfff5e0, 2.5);
shadowLight.position.set(-12, 12, 5);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.width = 4096;
shadowLight.shadow.mapSize.height = 4096;
shadowLight.shadow.bias = -0.001;
shadowLight.shadow.radius = 6;
shadowLight.shadow.camera.near = 0.1;
shadowLight.shadow.camera.far = 100;
shadowLight.shadow.camera.left = -30;
shadowLight.shadow.camera.right = 30;
shadowLight.shadow.camera.top = 30;
shadowLight.shadow.camera.bottom = -30;
shadowLight.target.position.set(0, 0, -17);
scene.add(shadowLight);
scene.add(shadowLight.target);

const fillLight = new THREE.DirectionalLight(0xaac8ff, 0.5);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

// ─── HDRI ────────────────────────────────────────────────────────────────────
const rgbeLoader = new RGBELoader();
rgbeLoader.load(urlHdri, (texture) => {
  texture.mapping = THREE.EquirectangularReflectionMapping;
  scene.environment = texture;
  scene.environmentIntensity = 0.4;
});

// ─── Camera ──────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
camera.position.set(0, 0.7, 0);
scene.add(camera);

// ─── Post-processing ─────────────────────────────────────────────────────────
const renderTarget = new THREE.WebGLRenderTarget(w, h, {
  type: THREE.HalfFloatType,
});
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.07, 1.2, 0.95);
composer.addPass(bloomPass);

const outlinePass = new OutlinePass(new THREE.Vector2(w, h), scene, camera);
outlinePass.edgeStrength = 3;
outlinePass.edgeGlow = 0;
outlinePass.edgeThickness = 1;
outlinePass.visibleEdgeColor.set(0xffffff);
outlinePass.hiddenEdgeColor.set(0x000000);
composer.addPass(outlinePass);

const kuwaharaPass = new ShaderPass(KuwaharaShader);
kuwaharaPass.uniforms["resolution"].value = [w, h];
composer.addPass(kuwaharaPass);

const vignettePass = new ShaderPass(VignetteShader);
vignettePass.uniforms["offset"].value = 0.75;
vignettePass.uniforms["darkness"].value = 2.0;
composer.addPass(vignettePass);

const smaaPass = new SMAAPass(w, h);
composer.addPass(smaaPass);
// ─── Chargement de la scène ───────────────────────────────────────────────────
const gltfLoader = new GLTFLoader();
let sceneRoot = null;

gltfLoader.load(urlScene, (gltf) => {
  sceneRoot = gltf.scene;

  sceneRoot.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (child.material?.emissiveMap) {
      child.material.emissive.set(0xffffff);
      child.material.emissiveIntensity = 3.0;
    } else if (child.material?.emissive?.getHex() !== 0x000000) {
      child.material.emissiveIntensity = 2.0;
    }
  });

  sceneRoot.getObjectByName("NUAGE")?.traverse((child) => {
    if (child.isMesh) {
      child.material.color.set(0xfff0e0);
      child.material.roughness = 1;
      child.material.metalness = 0;
    }
  });

  sceneRoot.getObjectByName("light")?.traverse((child) => {
    if (child.isMesh && child.material?.name === "light") {
      child.material.emissiveIntensity = 3.0;
    }
  });

  const box = new THREE.Box3().setFromObject(sceneRoot);
  const center = box.getCenter(new THREE.Vector3());

  sceneRoot.position.sub(center);
  scene.add(sceneRoot);
  sceneRoot.updateMatrixWorld(true);

  Object.keys(objectData).forEach((name) => {
    if (nonInteractable.includes(name)) return;
    const obj = sceneRoot.getObjectByName(name);
    if (!obj) return;

    const bbox = new THREE.Box3().setFromObject(obj);
    const worldCenter = bbox.getCenter(new THREE.Vector3());
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    const hoverScale = Math.min(Math.max(1 + 0.25 / maxDim, 1.1), 1.8);

    const wrapper = document.createElement("div");

    const div = document.createElement("div");
    div.className = "object-dot initial-hidden";
    wrapper.appendChild(div);

    div.addEventListener("mouseenter", () => {
      if (isZoomed) return;
      div.classList.add("hovered");
      gsap.to(obj.scale, {
        x: hoverScale,
        y: hoverScale,
        z: hoverScale,
        duration: 0.3,
        ease: "power2.out",
      });
    });

    div.addEventListener("mouseleave", () => {
      div.classList.remove("hovered");
      gsap.to(obj.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.3,
        ease: "power2.out",
      });
    });

    div.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isZoomed) return;
      isZoomed = true;
      hoveredObject = obj;
      Object.values(dotMap).forEach((d) => {
        d.classList.remove("hovered");
        d.classList.add("hidden");
      });
      zoomToObject(obj);
    });

    const label = new CSS2DObject(wrapper);
    const xSign = worldCenter.x >= 0 ? 1 : -1;
    const xEdge = xSign > 0 ? bbox.max.x : bbox.min.x;
    const worldSidePos = new THREE.Vector3(
      xEdge + xSign * 0.08,
      worldCenter.y,
      worldCenter.z,
    );
    const anchor = new THREE.Object3D();
    anchor.position.copy(worldSidePos);
    anchor.add(label);
    scene.add(anchor);

    dotMap[name] = div;
  });

  ScrollTrigger.create({
    trigger: document.body,
    start: "75% top",
    onEnter: () =>
      Object.values(dotMap).forEach((d) =>
        d.classList.remove("initial-hidden"),
      ),
    onLeaveBack: () =>
      Object.values(dotMap).forEach((d) => d.classList.add("initial-hidden")),
  });
});

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
  PINCEAUX: {
    title: "Les pinceaux",
    text: "Un pinceau devrait laisser une trace. Reproduire ce que l'œil voit, ce que la main sent, ce que le monde est. \n\nMais entre les mains de René Magritte, le pinceau trahit. Il peint une pomme qui cache un visage. Un homme qui flotte. Une pipe qui n'en est pas une. \n\nCe n'est plus un outil. C'est un menteur fidèle.\n\nLe pinceau ne représente pas la réalité — il la contredit, avec une précision chirurgicale, et un sourire que personne ne voit.",
  },
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

const cameraBase = { y: 0.7, z: 0, rotX: 0 };

gsap.to(cameraBase, {
  z: -34,
  ease: "power2.inOut",
  scrollTrigger: {
    trigger: document.body,
    start: "top top",
    end: "80% bottom",
    scrub: 1.2,
  },
});

gsap.to(cameraBase, {
  rotX: -Math.PI / 9,
  ease: "power2.inOut",
  scrollTrigger: {
    trigger: document.body,
    start: "10% top",
    end: "bottom bottom",
    scrub: 1.2,
  },
});

gsap.to(cameraBase, {
  y: 0,
  ease: "power2.inOut",
  scrollTrigger: {
    trigger: document.body,
    start: "10% top",
    end: "bottom bottom",
    scrub: 1.2,
  },
});

// ─── Intro ───────────────────────────────────────────────────────────────────
const introScrollTrigger = {
  trigger: document.body,
  start: "top top",
  end: "15% top",
  scrub: 1.2,
};

gsap.to(".intro-line", {
  opacity: 0,
  y: 80,
  ease: "power2.in",
  stagger: { each: 0.12, from: "end" },
  scrollTrigger: introScrollTrigger,
});

gsap.to("#intro-scroll", {
  opacity: 0,
  y: 30,
  ease: "power2.in",
  scrollTrigger: introScrollTrigger,
});

gsap.to("#intro-hommage", {
  opacity: 0,
  y: 40,
  ease: "power2.in",
  scrollTrigger: introScrollTrigger,
});

gsap.to("#intro", {
  backgroundColor: "rgba(38, 105, 136, 0)",
  ease: "power2.in",
  scrollTrigger: introScrollTrigger,
});

// ─── Tracking des objets ──────────────────────────────────────────────────────
const dotMap = {};
let hoveredObject = null;
let lookAtTarget = null;
let isZoomed = false;
let isReturning = false;

// ─── Zoom vers un objet ───────────────────────────────────────────────────────
function zoomToObject(obj) {
  const box = new THREE.Box3().setFromObject(obj);
  const targetPos = box.getCenter(new THREE.Vector3());

  const size = new THREE.Vector3();
  box.getSize(size);
  const maxDim = Math.max(size.x, size.y, size.z);

  const fov = camera.fov * (Math.PI / 180);
  const distance = (maxDim / 2 / Math.tan(fov / 2)) * 1.6;
  const fovX = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
  const worldOffset = 0.4 * distance * Math.tan(fovX / 2);

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

  const tempCam = camera.clone();
  tempCam.position.copy(zoomPos);
  tempCam.lookAt(lookOffset);
  const targetRot = tempCam.rotation.clone();

  gsap.to(camera.position, {
    x: zoomPos.x,
    y: zoomPos.y,
    z: zoomPos.z,
    duration: 1.2,
    ease: "power2.inOut",
  });

  gsap.to(camera.rotation, {
    x: targetRot.x,
    y: targetRot.y,
    z: targetRot.z,
    duration: 1.2,
    ease: "power2.inOut",
    onComplete: () => {
      lookAtTarget = lookOffset.clone();
      const data = objectData[obj.name];
      infoTitle.innerText = data ? data.title : obj.name;
      infoText.innerText = data ? data.text : "";
      infoPanel.classList.add("visible");
      document.body.style.cursor = "default";
    },
  });
}

// ─── Bouton retour ────────────────────────────────────────────────────────────
backBtn.addEventListener("click", () => {
  isZoomed = false;
  isReturning = true;
  lookAtTarget = null;
  outlinePass.selectedObjects = [];
  infoPanel.classList.remove("visible");
  Object.values(dotMap).forEach((d) => d.classList.remove("hidden"));

  gsap.to(camera.position, {
    x: 0,
    y: cameraBase.y,
    z: cameraBase.z,
    duration: 1.2,
    ease: "power2.inOut",
    onComplete: () => { isReturning = false; },
  });

  gsap.to(camera.rotation, {
    x: cameraBase.rotX,
    y: 0,
    z: 0,
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
  labelRenderer.setSize(newW, newH);
});

// ─── About ───────────────────────────────────────────────────────────────────
const aboutPanel = document.getElementById("about-panel");
const aboutClose = document.getElementById("about-close");

document.querySelector(".hat-icon").addEventListener("click", () => {
  aboutPanel.classList.add("visible");

  gsap.timeline()
    .fromTo(aboutPanel,                              { opacity: 0 },         { opacity: 1, duration: 0.45, ease: "power2.out" })
    .fromTo(aboutPanel.querySelector("h1"),          { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, "-=0.1")
    .fromTo(aboutClose,                              { opacity: 0, y: 0 },   { opacity: 1, y: 0, duration: 0.4,  ease: "power2.out" }, "<")
    .fromTo(document.getElementById("about-p"),      { opacity: 0, y:  40 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, "-=0.35")
    .fromTo(document.getElementById("auteur-rices"), { opacity: 0, y:  40 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, "-=0.3");
});

aboutClose.addEventListener("click", () => {
  gsap.timeline({ onComplete: () => aboutPanel.classList.remove("visible") })
    .to(document.getElementById("auteur-rices"), { opacity: 0, y: 40, duration: 0.3,  ease: "power3.in" })
    .to(document.getElementById("about-p"),      { opacity: 0, y: 40, duration: 0.35, ease: "power3.in" }, "-=0.15")
    .to(aboutPanel.querySelector("h1"), { opacity: 0, y: -40, duration: 0.35, ease: "power3.in" }, "-=0.2")
    .to(aboutClose,                     { opacity: 0,         duration: 0.25, ease: "power2.in" }, "<")
    .to(aboutPanel, { opacity: 0, duration: 0.3, ease: "power2.in" }, "-=0.1");
});

// ─── Mouse parallax ──────────────────────────────────────────────────────────
const mouse = { x: 0, y: 0 };
const mouseSmooth = { x: 0, y: 0 };

window.addEventListener("mousemove", (e) => {
  mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
  mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
});

const setTitleX    = gsap.quickSetter("#intro-content",  "x", "px");
const setTitleY    = gsap.quickSetter("#intro-content",  "y", "px");
const setContentX  = gsap.quickSetter(".about-content",  "x", "px");
const setContentY  = gsap.quickSetter(".about-content",  "y", "px");
const setACloseX   = gsap.quickSetter("#about-close",    "x", "px");
const setACloseY   = gsap.quickSetter("#about-close",    "y", "px");

// ─── Render loop ─────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);

  mouseSmooth.x += (mouse.x - mouseSmooth.x) * 0.08;
  mouseSmooth.y += (mouse.y - mouseSmooth.y) * 0.08;

  const px = mouseSmooth.x;
  const py = mouseSmooth.y;

  if (window.scrollY < window.innerHeight * 0.15) {
    setTitleX(px * 25);
    setTitleY(py * 15);
  } else {
    setTitleX(0);
    setTitleY(0);
  }

  if (aboutPanel.classList.contains("visible")) {
    setContentX(px * 20);
    setContentY(py * 12);
    setACloseX(px * 10);
    setACloseY(py * 6);
  } else {
    setContentX(0);
    setContentY(0);
    setACloseX(0);
    setACloseY(0);
  }

  if (!isZoomed && !isReturning) {
    camera.position.z = cameraBase.z;
    camera.position.y = cameraBase.y;
    camera.rotation.x = cameraBase.rotX;
  }

  if (lookAtTarget) camera.lookAt(lookAtTarget);

  renderer.render(scene, camera);
  composer.render();
  labelRenderer.render(scene, camera);
}

animate();
