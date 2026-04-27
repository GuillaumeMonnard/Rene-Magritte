// ============================================================
// Imports
// ============================================================
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import urlCouloir from "../assets/3d-model/COULOIR.glb";

// Enregistrement du plugin ScrollTrigger de GSAP
gsap.registerPlugin(ScrollTrigger);

// ============================================================
// Création du renderer (moteur de rendu WebGL)
// ============================================================
const w = window.innerWidth;
const h = window.innerHeight;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
renderer.setPixelRatio(window.devicePixelRatio); // meilleure qualité sur écrans HD

// Ajout du canvas au body et positionnement en fond de page
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed"; // ✅ corrigé (était une URL cassée)
renderer.domElement.style.top = "0"; // ✅ corrigé
renderer.domElement.style.left = "0"; // ✅ corrigé

// ============================================================
// Création de la scène
// ============================================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x888888); // fond gris pour voir le modèle

// ============================================================
// Création de la caméra
// ============================================================
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;

// ============================================================
// Contrôles orbitaux (permet de tourner autour du modèle avec la souris)
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // mouvement plus fluide

// ============================================================
// Chargement du modèle 3D au format GLB (exporté depuis Blender)
// ============================================================
const gltfLoader = new GLTFLoader(); // ✅ déclaration avant utilisation
gltfLoader.load(
  urlCouloir,

  // Callback succès : le modèle est chargé
  (gltf) => {
    scene.add(gltf.scene);
    console.log("✅ Modèle chargé avec succès :", gltf.scene);
  },

  // Callback progression : affiche le pourcentage de chargement
  (progress) => {
    const pourcentage = ((progress.loaded / progress.total) * 100).toFixed(1);
    console.log(`⏳ Chargement : ${pourcentage}%`);
  },

  // Callback erreur : affiche l'erreur si le fichier ne se charge pas
  (error) => {
    console.error("❌ Erreur lors du chargement du modèle GLB :", error);
  },
);

// ============================================================
// Éclairage de la scène
// ============================================================

// Lumière ambiante (éclaire uniformément toute la scène)
const lumierAmbiance = new THREE.AmbientLight(0xffffff, 1);
scene.add(lumierAmbiance);

// Lumière directionnelle (simule une source lumineuse comme le soleil)
const lumierDirectionnelle = new THREE.DirectionalLight(0xffffff, 1);
lumierDirectionnelle.position.set(5, 10, 5);
scene.add(lumierDirectionnelle);

// ============================================================
// Gestion du redimensionnement de la fenêtre
// ============================================================
window.addEventListener("resize", () => {
  const newW = window.innerWidth;
  const newH = window.innerHeight;

  camera.aspect = newW / newH;
  camera.updateProjectionMatrix(); // mise à jour de la perspective

  renderer.setSize(newW, newH);
});

// ============================================================
// Boucle d'animation principale
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  controls.update(); // nécessaire si enableDamping est activé
  renderer.render(scene, camera);
}

animate();
