/**
 * @fileoverview Manages the core THREE.js scene setup and rendering.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {CSS2DRenderer} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * Manages the THREE.js scene setup, camera, renderer, composer, and lights.
 */
export class SceneRenderer {
  private readonly scene = new THREE.Scene();
  private readonly renderer: THREE.WebGLRenderer;
  private readonly labelRenderer: CSS2DRenderer;
  private readonly composer: EffectComposer;
  private readonly bloomPass: UnrealBloomPass;
  readonly camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
  readonly cubeRenderTarget: THREE.WebGLCubeRenderTarget;
  readonly cubeCamera: THREE.CubeCamera;

  constructor(private readonly container: HTMLDivElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.labelRenderer = new CSS2DRenderer();

    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    const renderScene = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      1.2, // strength
      0.5, // radius
      0.2, // threshold
    );

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(renderScene);
    this.composer.addPass(this.bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);

    // Cube camera for reflections.
    this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
    this.cubeCamera = new THREE.CubeCamera(1, 1000, this.cubeRenderTarget);

    this.labelRenderer.setSize(width, height);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.labelRenderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    window.addEventListener('resize', this.onWindowResize);
  }

  /**
   * Adds an object to the scene.
   */
  add(object: THREE.Object3D) {
    this.scene.add(object);
  }

  /**
   * Removes an object from the scene.
   */
  remove(object: THREE.Object3D) {
    this.scene.remove(object);
  }

  /**
   * Updates the cube camera with the given position and spaceship mesh.
   * This is used to render the spaceship's reflection in the scene.
   */
  updateCubeCamera(
    cubeCamera: THREE.CubeCamera,
    position: THREE.Vector3,
    spaceshipMesh: THREE.Object3D,
  ) {
    spaceshipMesh.visible = false; // Hide spaceship from its own reflection
    this.add(cubeCamera);
    cubeCamera.position.copy(position);
    cubeCamera.update(this.renderer, this.scene);
    this.remove(cubeCamera); // Remove after update
    spaceshipMesh.visible = true;
  }

  /**
   * Intersects a raycaster with the scene.
   *
   * @param raycaster The raycaster to intersect.
   * @return The intersections, if any.
   */
  intersectObjects(raycaster: THREE.Raycaster): THREE.Intersection[] {
    return raycaster.intersectObjects(this.scene.children, true);
  }

  /**
   * Returns the bounding client rect of the renderer DOM element.
   */
  getRendererBoundingClientRect(): DOMRect {
    return this.renderer.domElement.getBoundingClientRect();
  }

  /**
   * Handles window resize events.
   */
  onWindowResize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
  };

  /**
   * Disposes of the scene and its resources.
   */
  dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
    this.scene.traverse((object: THREE.Object3D) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) {
        object.geometry.dispose();
        // This is a bit of a type assertion, but safe in this context
        if (Array.isArray((object as THREE.Mesh).material)) {
          ((object as THREE.Mesh).material as THREE.Material[]).forEach((m) => {
            m.dispose();
          });
        } else {
          ((object as THREE.Mesh).material as THREE.Material).dispose();
        }
      }
    });
  }

  /**
   * Renders the scene
   */
  render() {
    this.composer.render();
    this.labelRenderer.render(this.scene, this.camera);
  }
}
