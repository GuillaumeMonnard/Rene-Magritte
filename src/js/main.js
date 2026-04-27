import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader, MTLLoader } from "three/examples/jsm/Addons.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
gsap.registerPlugin(ScrollTrigger);

//création du fichier
const w = window.innerWidth;
const h = window.innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = "fixed";
renderer.domElement.style.top = 0;
renderer.domElement.style.left = 0;

//import de ma scène blender
const sceneLoader = new MTLLoader();
sceneLoader.loadMtl();
