import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GUI } from 'three/examples/jsm/libs/lil-gui.module.min.js';


import MyRGBMapTexture from './assets/1.png';
import MyDepthMapTexture from './assets/1_depth.png';

let mesh;
let material;
let image_ar;

const settings = {
  metalness: 0.0,
  roughness: 0.14,
  ambientIntensity: 0.85,
  displacementScale: 5,
  displacementBias: -0.5,
};

// ...

let headDetected = true;
let lastKnownView = { x: 0, y: 0, z: 0 };

function updateHeadDetected() {
  setTimeout(() => {
    let currentView = { x: 0, y: 0, z: 0 };

    if (Parallax.view) {
      currentView = { x: Parallax.view.x, y: Parallax.view.y, z: Parallax.view.z };
    }

    if (
      currentView.x === lastKnownView.x &&
      currentView.y === lastKnownView.y &&
      currentView.z === lastKnownView.z
    ) {
      headDetected = false;
    } else {
      lastKnownView = { ...currentView };
      updateHeadDetected();
    }
  }, 2000); // 1 second delay
}

Parallax.init((view) => {
  camera.position.x = view.x * 0.3;
  camera.position.y = view.y * 0.3;
  camera.position.z = view.z * 1.5 + 3;

  // Reset headDetected to true when the view changes
  headDetected = true;

  // Update last known view
  lastKnownView = { ...view };



  // Start checking for head detection after initialization
  updateHeadDetected();
}, {
  smoothEye: 0.1,
  smoothDist: 0.15,
  defautDist: 0.12,
  threshold: 0.85
});


// init
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
// camera.position.z = 3;

const scene = new THREE.Scene();

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setAnimationLoop(animation);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.outputEncoding = THREE.sRGBEncoding;
document.body.appendChild(renderer.domElement);

// animation
function animation(time) {
  renderer.render(scene, camera);
  if (!headDetected) {
    console.log('Head not detected');
    // Return camera to neutral position when head is not detected
    camera.position.x = 0;
    camera.position.y = 0;
    camera.position.z = 5;
    material.displacementScale = 5;
  }
}

function onWindowResize() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// orbit controls
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableZoom = true;
// controls.enableDamping = true;

// Load RGB and depth map images
function loadImage(src, callback) {
  const img = new Image();
  img.onload = function () {
    callback(img);
  };
  img.src = src;
}

loadImage(MyRGBMapTexture, function (rgbImage) {
  loadImage(MyDepthMapTexture, function (depthImage) {
    handleImages(rgbImage, depthImage);
  });
});

function handleImages(rgbImage, depthImage) {
  if (mesh) {
    mesh.geometry.dispose();
    mesh.material.dispose();
    scene.remove(mesh);
  }

  image_ar = rgbImage.width / rgbImage.height;

  const ctxRGB = document.createElement('canvas').getContext('2d');
  ctxRGB.canvas.width = rgbImage.width;
  ctxRGB.canvas.height = rgbImage.height;
  ctxRGB.drawImage(rgbImage, 0, 0);
  const myrgbmap = new THREE.CanvasTexture(ctxRGB.canvas);

  const ctxDepth = document.createElement('canvas').getContext('2d');
  ctxDepth.canvas.width = depthImage.width;
  ctxDepth.canvas.height = depthImage.height;

  // Invert the depth values
  ctxDepth.drawImage(depthImage, 0, 0);
  const depthImageData = ctxDepth.getImageData(0, 0, depthImage.width, depthImage.height);
  const depthData = depthImageData.data;

  for (let i = 0; i < depthData.length; i += 4) {
    const depthValue = depthData[i] / 255; // Normalize to [0, 1]
    const invertedDepthValue = 1 - depthValue; // Invert the depth value
    depthData[i] = invertedDepthValue * 255; // Scale back to [0, 255]
  }

  ctxDepth.putImageData(depthImageData, 0, 0);

  const mydepthmap = new THREE.CanvasTexture(ctxDepth.canvas);

  // material
  material = new THREE.MeshStandardMaterial({
    color: 0xaaaaaa,
    roughness: 0,
    metalness: 0,
    map: myrgbmap,
    displacementMap: mydepthmap,
    displacementScale: settings.displacementScale,
    displacementBias: -0.5,
  });
 
  // generating geometry and add mesh to scene
  const geometry = new THREE.PlaneGeometry(10, 10, 512, 1024);
  mesh = new THREE.Mesh(geometry, material);
  mesh.scale.y = 1.0 / image_ar;
  mesh.scale.multiplyScalar(0.23);
  scene.add(mesh);
}

// setup gui
const gui = new GUI();
// gui.add(settings, 'metalness').min(0).max(1).onChange(function (value) {
//   material.metalness = value;
// });
// gui.add(settings, 'roughness').min(0).max(1).onChange(function (value) {
//   material.roughness = value;
// });
gui.add(settings, 'ambientIntensity').min(0).max(1).onChange(function (value) {
  ambientLight.intensity = value;
});
gui.add(settings, 'displacementScale').min(0).max(30.0).onChange(function (value) {
  material.displacementScale = value;
});
gui.add(settings, 'displacementBias').min(-10).max(10).onChange(function (value) {
  material.displacementBias = value;
});