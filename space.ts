/**
 * @fileoverview Control real time music with text prompts
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, property, query} from 'lit/decorators.js';

import * as THREE from 'three';

import {PointCloud, PointCloudGenerator} from './points';
import {SceneRenderer} from './scene';
import {PointHighlighter, PointSelector} from './selection';
import {Spaceship} from './spaceship';

const MAX_PROMPTS = 10;
const MIN_PROMPT_WEIGHT = 0.1;
const MAX_IN_VIEW_LABELS = 5;
const LABEL_UPDATE_THROTTLE = 5;
const LABEL_SELECTION_CONE_DEGREES = 25;
const LABEL_SELECTION_CONE_HEIGHT = 40;
const HIGHLIGHT_UPDATE_THROTTLE = 3;

/**
 * Interactive music latent space visualization component.
 */
@customElement('space-component')
export class SpaceComponent extends LitElement {
  @property({type: Object})
  embeddingsCache: Map<string, number[]>;

  @property({type: Number})
  pointCount = 500;

  @property({type: Number})
  embeddingDimensions = 128;

  @property({type: Number})
  neighborRadius = 0.25; // For cosine distance, lower is more similar

  @property({type: Boolean})
  includeHighDimensionalNeighbors = true;

  @property({type: Number})
  threeDClickRadius = 1.0; // World units for 3D click detection on empty space

  @property({type: Number})
  cameraProximityRadius = 5.0;

  @property({type: Array})
  selectedEmbeddings: Array<[string, number[]]> = [];

  @property({type: Boolean})
  randomizeEmbeddings = true;

  @property({type: Boolean})
  randomizePoints = false;

  @property({type: Number})
  nNeighbors = 15;

  @property({type: Number})
  minDist = 0.1;

  @property({type: Number})
  spread = 0.75;

  private pointCloudGenerator!: PointCloudGenerator;
  private sceneRenderer!: SceneRenderer;
  private pointCloud: PointCloud | null = null;
  private readonly pointHighlighter = new PointHighlighter();
  private pointSelector!: PointSelector;
  private readonly raycaster = new THREE.Raycaster();
  private readonly mouse = new THREE.Vector2();
  private spaceship: Spaceship | null = null;

  private animationFrameId?: number;
  private frameCount = 0;
  private readonly keysPressed = new Set<string>();
  private lastDispatchedWeights: {[key: string]: number} | null = null;

  @query('#container')
  private container!: HTMLDivElement;

  constructor() {
    super();
    this.embeddingsCache = new Map<string, number[]>();
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.animateFrame();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.sceneRenderer.dispose();
    this.pointCloud?.dispose();
    this.container.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  protected firstUpdated(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const seedParam = urlParams.get('rng-seed');
    // Set the default random number generator seed to midnight today, so the
    // the point cloud is consistent throughout the day and updates daily.
    let rngSeed = new Date().setHours(0, 0, 0, 0);
    if (seedParam) {
      const parsedSeed = Number(seedParam);
      if (!isNaN(parsedSeed)) {
        rngSeed = parsedSeed;
      }
    }
    this.sceneRenderer = new SceneRenderer(this.container);
    this.pointCloudGenerator = new PointCloudGenerator(
      this.embeddingsCache,
      rngSeed,
    );
    this.container.addEventListener('click', this.onClick);
    this.spaceship = new Spaceship(this.sceneRenderer.cubeRenderTarget);
    this.spaceship.onAutopilotChanged = (active) => {
      if (!active) {
        this.dispatchEvent(
          new CustomEvent('autopilot-disengaged', {
            bubbles: true,
            composed: true,
          }),
        );
      }
    };
    this.sceneRenderer.add(this.spaceship.getMesh());
    this.renderEmbeddings();
    this.setupSpaceshipInitialPosition();

    this.pointSelector = new PointSelector(
      this.pointCloudGenerator,
      () => this.pointCloud,
      {
        threeDClickRadius: this.threeDClickRadius,
        cameraProximityRadius: this.cameraProximityRadius,
        neighborRadius: this.neighborRadius,
        includeHighDimensionalNeighbors: this.includeHighDimensionalNeighbors,
      },
    );
  }

  protected updated(changedProperties: Map<string, unknown>) {
    const optionsToUpdate: Partial<
      Parameters<PointSelector['updateOptions']>[0]
    > = {};
    if (changedProperties.has('threeDClickRadius')) {
      optionsToUpdate.threeDClickRadius = this.threeDClickRadius;
    }
    if (changedProperties.has('cameraProximityRadius')) {
      optionsToUpdate.cameraProximityRadius = this.cameraProximityRadius;
    }
    if (changedProperties.has('neighborRadius')) {
      optionsToUpdate.neighborRadius = this.neighborRadius;
    }
    if (changedProperties.has('includeHighDimensionalNeighbors')) {
      optionsToUpdate.includeHighDimensionalNeighbors =
        this.includeHighDimensionalNeighbors;
    }

    if (Object.keys(optionsToUpdate).length > 0) {
      this.pointSelector.updateOptions(optionsToUpdate);
    }

    if (
      changedProperties.has('includeHighDimensionalNeighbors') ||
      changedProperties.has('neighborRadius')
    ) {
      this.pointSelector.recalculateNeighbors();
    }
  }

  /**
   * Renders the space with the current embeddings and settings.
   */
  renderSpace() {
    // Preserve the labels of the manually selected points
    const preservedManualSelection =
      this.pointSelector.getPreservedManualSelection();

    this.cleanupScene();
    this.renderEmbeddings();

    // Restore manual selection state if it existed, finding the new meshes
    if (preservedManualSelection && this.pointCloud) {
      this.pointSelector.restoreManualSelection(
        preservedManualSelection,
        this.pointCloud,
      );
    }

    const pointsGroup = this.pointCloud?.getPointsGroup();
    if (this.spaceship && pointsGroup) {
      const box = new THREE.Box3().setFromObject(pointsGroup);
      const spaceshipMesh = this.spaceship.getMesh();
      // If the spaceship is far from the new point cloud, move it closer.
      if (!box.containsPoint(spaceshipMesh.position)) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const spaceshipOffset = size.z / 2 + 10;
        spaceshipMesh.position.set(
          center.x,
          center.y,
          center.z + spaceshipOffset,
        );
        // Reset autopilot to find a new path
        this.spaceship.resetAutopilotTarget();
      }
    }

    this.updateAndRenderHighlights(true);
    this.pointCloud?.updateLabelVisibilities(
      this.sceneRenderer.camera,
      this.spaceship!.getMesh(),
      this.spaceship!.occlusionHull,
      this.pointHighlighter.getHighlightedObjects(),
      this.frameCount,
      LABEL_UPDATE_THROTTLE,
      LABEL_SELECTION_CONE_DEGREES,
      LABEL_SELECTION_CONE_HEIGHT,
      MAX_IN_VIEW_LABELS,
      true,
    );
  }

  /**
   * Toggles the autopilot mode of the spaceship.
   */
  toggleAutopilot() {
    return this.spaceship?.toggleAutopilot();
  }

  private setupSpaceshipInitialPosition(): void {
    // Position the spaceship initially based on the point cloud's bounds.
    const pointsGroup = this.pointCloud?.getPointsGroup();
    if (this.spaceship && pointsGroup) {
      const box = new THREE.Box3().setFromObject(pointsGroup);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      // Position it just outside the bounding box on the Z axis, relative to the center.
      // This places it in a good starting position to fly into the cloud.
      const spaceshipOffset = size.z / 2 + 10;
      const spaceshipMesh = this.spaceship.getMesh();
      spaceshipMesh.position.set(
        center.x,
        center.y,
        center.z + spaceshipOffset,
      );

      // Set the initial camera position to avoid a jarring jump.
      // This calculates the camera's starting position based on the spaceship's
      // initial position, mirroring the logic in `updateCameraFollow`.
      // const offset = new THREE.Vector3(0, 1.5, 5);
      const offset = new THREE.Vector3(0, 1.5, -5);
      offset.applyQuaternion(spaceshipMesh.quaternion);
      const initialCameraPosition = spaceshipMesh.position.clone().add(offset);
      this.sceneRenderer.camera.position.copy(initialCameraPosition);
      this.sceneRenderer.camera.lookAt(spaceshipMesh.position);
    }
  }

  private cleanupScene() {
    if (this.pointCloud) {
      this.sceneRenderer.remove(this.pointCloud.getPointsGroup());
    }
    this.pointCloud?.dispose();
    this.pointCloud = null;
    this.pointHighlighter.resetHighlights();
  }

  private renderEmbeddings(): void {
    const {data, selectedEmbeddings} =
      this.pointCloudGenerator.generatePointCloudData(
        this.pointCount,
        this.embeddingDimensions,
        this.randomizeEmbeddings,
        {
          nNeighbors: this.nNeighbors,
          minDist: this.minDist,
          spread: this.spread,
        },
        this.selectedEmbeddings,
      );
    this.selectedEmbeddings = selectedEmbeddings;

    this.pointCloud = new PointCloud(data);
    this.sceneRenderer.add(this.pointCloud.getPointsGroup());
  }

  private readonly animateFrame = () => {
    this.animationFrameId = requestAnimationFrame(this.animateFrame);
    this.frameCount++;
    if (!this.sceneRenderer || !this.spaceship) {
      return;
    }

    const spaceshipMesh = this.spaceship.getMesh();
    const cubeCamera = this.sceneRenderer.cubeCamera;
    if (cubeCamera) {
      this.sceneRenderer.updateCubeCamera(
        cubeCamera,
        spaceshipMesh.position,
        spaceshipMesh,
      );
    }
    const pointsGroup = this.pointCloud?.getPointsGroup();
    const pointMeshes = this.pointCloud?.getPointMeshes() ?? [];
    this.spaceship.updatePosition(this.keysPressed, pointsGroup, pointMeshes);
    this.updateCameraFollow();
    this.updateAndRenderHighlights();
    this.pointCloud?.updateLabelVisibilities(
      this.sceneRenderer.camera,
      this.spaceship.getMesh(),
      this.spaceship.occlusionHull,
      this.pointHighlighter.getHighlightedObjects(),
      this.frameCount,
      LABEL_UPDATE_THROTTLE,
      LABEL_SELECTION_CONE_DEGREES,
      LABEL_SELECTION_CONE_HEIGHT,
      MAX_IN_VIEW_LABELS,
    );

    this.sceneRenderer.render();
  };

  private updateAndRenderHighlights(force = false) {
    if (!this.sceneRenderer || !this.spaceship) {
      return;
    }
    // Throttle function to run every few frames to prevent UI lag.
    if (!force && this.frameCount % HIGHLIGHT_UPDATE_THROTTLE !== 0) {
      return;
    }

    const spaceshipMesh = this.spaceship.getMesh();
    const spaceshipPos = spaceshipMesh.position;
    this.pointSelector.updateProximitySelection(spaceshipPos);

    const combinedWeights = this.pointSelector.getCombinedWeights();

    if (
      Object.keys(combinedWeights).length === 0 &&
      !this.pointSelector.hasManualSelection()
    ) {
      if (this.pointHighlighter.getHighlightedObjects().length > 0) {
        this.pointHighlighter.resetHighlights();
      }
      if (
        this.lastDispatchedWeights &&
        Object.keys(this.lastDispatchedWeights).length > 0
      ) {
        this.lastDispatchedWeights = {};
        this.dispatchEvent(
          new CustomEvent('prompts-selected', {
            detail: {promptWeights: {}},
            bubbles: true,
            composed: true,
          }),
        );
      }
      return;
    }

    this.pointHighlighter.highlightSelection(
      this.pointCloud,
      this.pointSelector.getProximityMeshes(),
      this.pointSelector.getManualPrimaryMeshes(),
      this.pointSelector.getNeighborIndices(),
      this.pointSelector.getDirectlyClickedMesh(),
      this.pointSelector.getProximityWeights(),
      this.pointSelector.getManualSelectionWeights(),
    );

    const filteredWeights: {[key: string]: number} = Object.fromEntries(
      Object.entries(combinedWeights)
        .filter(([, weight]) => weight >= MIN_PROMPT_WEIGHT)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_PROMPTS),
    );

    // Check if weights have changed before dispatching.
    if (this.haveWeightsChanged(filteredWeights)) {
      this.lastDispatchedWeights = {...filteredWeights};
      this.dispatchEvent(
        new CustomEvent('prompts-selected', {
          detail: {promptWeights: filteredWeights},
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    this.keysPressed.add(key);
  };

  private readonly onKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    this.keysPressed.delete(key);
  };

  private updateCameraFollow() {
    if (!this.spaceship) {
      return;
    }
    const spaceshipMesh = this.spaceship.getMesh();
    // Position behind and above the spaceship.
    const offset = new THREE.Vector3(0, 1.5, -5);
    // Apply the spaceship's rotation to the offset.
    offset.applyQuaternion(spaceshipMesh.quaternion);
    // Add the offset to the spaceship's position
    const desiredCameraPosition = spaceshipMesh.position.clone().add(offset);

    // Smoothly interpolate the camera's position
    this.sceneRenderer.camera.position.lerp(desiredCameraPosition, 0.1);
    this.sceneRenderer.camera.lookAt(spaceshipMesh.position);
  }

  private readonly onClick = (event: MouseEvent) => {
    // Calculate mouse position in normalized device coordinates
    const rect = this.sceneRenderer.getRendererBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the selection ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mouse, this.sceneRenderer.camera);

    this.pointSelector.selectByClick(
      this.raycaster,
      this.sceneRenderer.camera.position,
    );
  };

  private haveWeightsChanged(newWeights: {[key: string]: number}): boolean {
    const oldWeights = this.lastDispatchedWeights;
    if (!oldWeights) {
      return Object.keys(newWeights).length > 0;
    }

    const oldKeys = Object.keys(oldWeights);
    const newKeys = Object.keys(newWeights);
    if (oldKeys.length !== newKeys.length) {
      return true;
    }

    for (const key of newKeys) {
      if (oldWeights[key] !== newWeights[key]) {
        return true;
      }
    }
    return false;
  }

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
      position: relative; /* Needed for absolute positioning of the labels */
      background-color: #111;
    }
    #container {
      width: 100%;
      height: 100%;
    }
    /* PointCloud label styles */
    .label {
      color: #c2f1ff;
      font-family: sans-serif;
      font-size: 12px;
      background: rgba(0, 0, 0, 0.75);
      border-radius: 4px;
      padding: 2px 5px;
      white-space: nowrap;
      text-shadow: 0 0 6px rgba(160, 233, 255, 0.6);
      visibility: hidden;
      transform-origin: left center;
      transition: transform 0.1s ease-out;
    }
  `;

  render() {
    return html`<div id="container"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'space-component': SpaceComponent;
  }
}
