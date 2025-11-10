/**
 * @fileoverview Manages the visual highlighting of points in the point cloud.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {PointCloud, PointCloudGenerator} from './points';

// Highlighting Colors and Intensities
const DEFAULT_COLOR = new THREE.Color(0x6e6e78); // Medium Gray
const SELECTED_COLOR = new THREE.Color(0xc590df); // Ligher purple
const PROXIMITY_COLOR = new THREE.Color(0xffffff); // White
const DIRECTLY_SELECTED_COLOR = new THREE.Color(0xac61d1); // Purple
const NEIGHBOR_COLOR = new THREE.Color(0xdec0ed); // Lighter purple
const DEFAULT_INTENSITY = 0.1;
const NEIGHBOR_INTENSITY = 0.05;
const PROXIMITY_INTENSITY = 0.075;
const SELECTED_INTENSITY = 0.8;

/**
 * Manages the visual highlighting of points in the point cloud.
 */
export class PointHighlighter {
  private highlightedObjects: THREE.Mesh[] = [];

  /**
   * Resets the highlights to the default color and clears the list of
   * highlighted objects.
   */
  resetHighlights(): void {
    for (const mesh of this.highlightedObjects) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(DEFAULT_COLOR);
      material.emissive.set(DEFAULT_COLOR);
      material.emissiveIntensity = DEFAULT_INTENSITY;
    }
    this.highlightedObjects = [];
  }

  /**
   * Returns the list of highlighted objects.
   */
  getHighlightedObjects(): THREE.Mesh[] {
    return this.highlightedObjects;
  }

  /**
   * Updates the highlights based on the current selection state.
   *
   * @param pointCloud The point cloud to highlight.
   * @param proximityMeshes The proximity meshes to highlight.
   * @param manualPrimaryMeshes The manual primary meshes to highlight.
   * @param neighborIndices The neighbor indices to highlight.
   * @param directlyClickedMesh The directly clicked mesh to highlight.
   * @param proximityWeights The proximity weights to highlight.
   * @param manualSelectionWeights The manual selection weights to highlight.
   */
  highlightSelection(
    pointCloud: PointCloud | null,
    proximityMeshes: THREE.Mesh[],
    manualPrimaryMeshes: THREE.Mesh[],
    neighborIndices: Set<number>,
    directlyClickedMesh: THREE.Mesh | null,
    proximityWeights: {[key: string]: number},
    manualSelectionWeights: {[key: string]: number},
  ) {
    if (!pointCloud) return;
    this.resetHighlights();

    const allPrimaryMeshes = [
      ...new Set([...proximityMeshes, ...manualPrimaryMeshes]),
    ];
    const primaryGroupIndices = new Set<number>(
      allPrimaryMeshes.map((m) => m.userData.index),
    );

    this.highlightNeighbors(pointCloud, neighborIndices, primaryGroupIndices);
    this.highlightPrimary(
      proximityMeshes,
      manualPrimaryMeshes,
      directlyClickedMesh,
      proximityWeights,
      manualSelectionWeights,
    );
  }

  private highlightNeighbors(
    pointCloud: PointCloud,
    neighborIndices: Set<number>,
    primaryGroupIndices: Set<number>,
  ) {
    for (const index of neighborIndices) {
      if (!primaryGroupIndices.has(index)) {
        const neighborMesh = pointCloud.getPointMeshes()[index];
        if (neighborMesh) {
          const material = neighborMesh.material as THREE.MeshStandardMaterial;
          material.color.set(NEIGHBOR_COLOR);
          material.emissive.set(NEIGHBOR_COLOR);
          material.emissiveIntensity = NEIGHBOR_INTENSITY;
          this.highlightedObjects.push(neighborMesh);
        }
      }
    }
  }

  private highlightPrimary(
    proximityMeshes: THREE.Mesh[],
    manualPrimaryMeshes: THREE.Mesh[],
    directlyClickedMesh: THREE.Mesh | null,
    proximityWeights: {[key: string]: number},
    manualSelectionWeights: {[key: string]: number},
  ) {
    const allPrimaryMeshes = [
      ...new Set([...proximityMeshes, ...manualPrimaryMeshes]),
    ];
    const manualSet = new Set(manualPrimaryMeshes);
    const proximitySet = new Set(proximityMeshes);

    for (const mesh of allPrimaryMeshes) {
      const material = mesh.material as THREE.MeshStandardMaterial;
      const label = mesh.userData.label as string;
      const isManual = manualSet.has(mesh);
      const isProximity = proximitySet.has(mesh);
      let color;
      let intensity;

      if (isManual && isProximity) {
        const manualWeight = manualSelectionWeights[label];
        const proximityWeight = proximityWeights[label];
        if (proximityWeight > manualWeight) {
          color = PROXIMITY_COLOR;
          intensity = PROXIMITY_INTENSITY * proximityWeight;
        } else {
          color =
            mesh === directlyClickedMesh
              ? DIRECTLY_SELECTED_COLOR
              : SELECTED_COLOR;
          intensity = SELECTED_INTENSITY * manualWeight;
        }
      } else if (isManual) {
        const manualWeight = manualSelectionWeights[label];
        color =
          mesh === directlyClickedMesh
            ? DIRECTLY_SELECTED_COLOR
            : SELECTED_COLOR;
        intensity = SELECTED_INTENSITY * manualWeight;
      } else {
        // isProximity
        const proximityWeight = proximityWeights[label];
        color = PROXIMITY_COLOR;
        intensity = PROXIMITY_INTENSITY * proximityWeight;
      }

      material.color.set(color);
      material.emissive.set(color);
      material.emissiveIntensity = intensity;
      this.highlightedObjects.push(mesh);
    }
  }
}

/**
 * The state of the manual selection.
 */
export interface ManualSelectionState {
  primaryMeshes: THREE.Mesh[];
  selectionWeights: {[key: string]: number};
  directlyClickedMesh: THREE.Mesh | null;
  neighborDistances: Map<number, number>;
}

/**
 * The state of the manual selection, preserved for restoring.
 */
export interface PreservedManualSelection {
  primaryLabels: string[];
  clickedLabel: string | null;
  weights: {[key: string]: number};
}

/**
 * Manages the selection of points in the point cloud, including manual clicks,
 * proximity to an object, and high-dimensional neighbors.
 */
export class PointSelector {
  private manualSelectionState: ManualSelectionState | null = null;
  private proximityMeshes: THREE.Mesh[] = [];
  private proximityWeights: {[key: string]: number} = {};

  constructor(
    private readonly pointCloudGenerator: PointCloudGenerator,
    private readonly getPointCloud: () => PointCloud | null,
    private readonly options: {
      threeDClickRadius: number;
      cameraProximityRadius: number;
      neighborRadius: number;
      includeHighDimensionalNeighbors: boolean;
    },
  ) {}

  /**
   * Updates the options for the point selector.
   */
  updateOptions(newOptions: Partial<typeof this.options>) {
    Object.assign(this.options, newOptions);
  }

  /**
   * Selects points in the point cloud by click. When the user clicks on space,
   * this method finds the closest points to the clicked point and selects them.
   */
  selectByClick(raycaster: THREE.Raycaster, cameraPosition: THREE.Vector3) {
    const intersects = raycaster.intersectObjects(
      this.getPointCloud()?.getPointsGroup().children || [],
      true,
    );

    const primaryMeshes: THREE.Mesh[] = [];
    let directlyClickedMesh: THREE.Mesh | null = null;
    const selectionWeights: {[key: string]: number} = {};
    const radius = this.options.threeDClickRadius;
    const radiusSq = radius * radius;
    const pointCloud = this.getPointCloud();
    if (!pointCloud) {
      return;
    }

    if (intersects.length > 0) {
      const targetMesh = intersects[0].object;
      if (targetMesh instanceof THREE.Mesh && targetMesh.userData.vector) {
        directlyClickedMesh = targetMesh;
        const centerPointObject = targetMesh.parent;
        if (centerPointObject) {
          const centerPosition = new THREE.Vector3();
          centerPointObject.getWorldPosition(centerPosition);
          const searchRay = new THREE.Ray(
            cameraPosition,
            centerPosition.clone().sub(cameraPosition).normalize(),
          );

          for (const mesh of pointCloud.getPointMeshes()) {
            const pointObject = mesh.parent;
            if (!pointObject) {
              continue;
            }
            const worldPosition = new THREE.Vector3();
            pointObject.getWorldPosition(worldPosition);
            const distanceToRaySq = searchRay.distanceSqToPoint(worldPosition);
            if (distanceToRaySq < radiusSq) {
              primaryMeshes.push(mesh);
              const distance = Math.sqrt(distanceToRaySq);
              const normalizedWeight = 1 - Math.min(distance, radius) / radius;
              selectionWeights[mesh.userData.label] = normalizedWeight;
            }
          }
        }
      }
    } else {
      const clickedRay = raycaster.ray;
      for (const mesh of pointCloud.getPointMeshes()) {
        const pointObject = mesh.parent;
        if (!pointObject) {
          continue;
        }
        const worldPosition = new THREE.Vector3();
        pointObject.getWorldPosition(worldPosition);
        const distanceToRaySq = clickedRay.distanceSqToPoint(worldPosition);
        if (distanceToRaySq < radiusSq) {
          primaryMeshes.push(mesh);
          const distance = Math.sqrt(distanceToRaySq);
          const normalizedWeight = 1 - Math.min(distance, radius) / radius;
          selectionWeights[mesh.userData.label] = normalizedWeight;
        }
      }
    }

    if (primaryMeshes.length === 0) {
      this.manualSelectionState = null;
      return;
    }

    let neighborDistances = new Map<number, number>();
    if (this.options.includeHighDimensionalNeighbors) {
      const primaryVectors = primaryMeshes.map((m) => m.userData.vector);
      const allVectors = pointCloud
        .getPointMeshes()
        .map((m: THREE.Mesh) => m.userData.vector);
      neighborDistances = this.pointCloudGenerator.findHighDimensionalNeighbors(
        primaryVectors,
        allVectors,
        this.options.neighborRadius,
      );
      this.addNeighborsToWeights(neighborDistances, selectionWeights);
    }

    this.manualSelectionState = {
      primaryMeshes,
      selectionWeights,
      directlyClickedMesh,
      neighborDistances,
    };
  }

  /**
   * Updates the proximity selection based on the current camera position.
   */
  updateProximitySelection(position: THREE.Vector3) {
    this.proximityMeshes = [];
    this.proximityWeights = {};
    const radius = this.options.cameraProximityRadius;
    const radiusSq = radius * radius;
    const pointCloud = this.getPointCloud();
    if (!pointCloud) return;

    const nearbyMeshes = pointCloud.querySpatialGrid(position, radius) ?? [];
    for (const mesh of nearbyMeshes) {
      const pointObject = mesh.parent;
      if (!pointObject) return;
      const worldPosition = new THREE.Vector3();
      pointObject.getWorldPosition(worldPosition);
      const distanceSq = position.distanceToSquared(worldPosition);
      if (distanceSq < radiusSq) {
        const distance = Math.sqrt(distanceSq);
        const normalizedWeight = 1 - Math.min(distance, radius) / radius;
        this.proximityWeights[mesh.userData.label] = normalizedWeight;
        this.proximityMeshes.push(mesh);
      }
    }
  }

  private addNeighborsToWeights(
    neighborDistances: Map<number, number>,
    selectionWeights: {[key: string]: number},
  ) {
    if (!this.options.includeHighDimensionalNeighbors) return;
    const pointCloud = this.getPointCloud();
    if (!pointCloud) return;

    for (const [index, distance] of neighborDistances) {
      const neighborMesh = pointCloud.getPointMeshes()[index];
      if (neighborMesh && !(neighborMesh.userData.label in selectionWeights)) {
        const normalizedWeight =
          1 -
          Math.min(distance, this.options.neighborRadius) /
            this.options.neighborRadius;
        selectionWeights[neighborMesh.userData.label] = normalizedWeight;
      }
    }
  }

  /**
   * Returns the combined weights of the proximity and manual selections.
   * This is used to determine the relative weights of the selection.
   */
  getCombinedWeights(): {[key: string]: number} {
    const combinedWeights = {...this.proximityWeights};
    if (this.manualSelectionState) {
      for (const label in this.manualSelectionState.selectionWeights) {
        if (
          Object.prototype.hasOwnProperty.call(
            this.manualSelectionState.selectionWeights,
            label,
          )
        ) {
          const manualWeight =
            this.manualSelectionState.selectionWeights[label];
          if (
            combinedWeights[label] === undefined ||
            manualWeight > combinedWeights[label]
          ) {
            combinedWeights[label] = manualWeight;
          }
        }
      }
      if (this.options.includeHighDimensionalNeighbors) {
        this.addNeighborsToWeights(
          this.manualSelectionState.neighborDistances,
          combinedWeights,
        );
      }
    }
    return combinedWeights;
  }

  /**
   * Recalculates the neighbor distances in high-dimensional space.
   */
  recalculateNeighbors() {
    if (
      !this.manualSelectionState ||
      !this.options.includeHighDimensionalNeighbors
    ) {
      if (this.manualSelectionState) {
        this.manualSelectionState.neighborDistances = new Map();
      }
      return;
    }
    const pointCloud = this.getPointCloud();
    if (!pointCloud) {
      return;
    }

    const primaryVectors = this.manualSelectionState.primaryMeshes.map(
      (m) => m.userData.vector,
    );
    const allVectors = pointCloud
      .getPointMeshes()
      .map((m) => m.userData.vector);
    this.manualSelectionState.neighborDistances =
      this.pointCloudGenerator.findHighDimensionalNeighbors(
        primaryVectors,
        allVectors,
        this.options.neighborRadius,
      );
  }

  /**
   * Returns the proximity meshes.
   */
  getProximityMeshes(): THREE.Mesh[] {
    return this.proximityMeshes;
  }

  /**
   * Returns the manual primary meshes.
   */
  getManualPrimaryMeshes(): THREE.Mesh[] {
    return this.manualSelectionState
      ? this.manualSelectionState.primaryMeshes
      : [];
  }

  /**
   * Returns the neighbor indices to highlight.
   */
  getNeighborIndices(): Set<number> {
    return this.manualSelectionState &&
      this.options.includeHighDimensionalNeighbors
      ? new Set(this.manualSelectionState.neighborDistances.keys())
      : new Set();
  }

  /**
   * Returns the directly clicked mesh.
   */
  getDirectlyClickedMesh(): THREE.Mesh | null {
    return this.manualSelectionState
      ? this.manualSelectionState.directlyClickedMesh
      : null;
  }

  /**
   * Returns the proximity weights.
   */
  getProximityWeights(): {[key: string]: number} {
    return this.proximityWeights;
  }

  /**
   * Returns the manual selection weights.
   */
  getManualSelectionWeights(): {[key: string]: number} {
    return this.manualSelectionState
      ? this.manualSelectionState.selectionWeights
      : {};
  }

  /**
   * Returns whether the manual selection is present.
   */
  hasManualSelection(): boolean {
    return this.manualSelectionState !== null;
  }

  /**
   * Returns the preserved manual selection, or null if there is none.
   */
  getPreservedManualSelection(): PreservedManualSelection | null {
    return this.manualSelectionState
      ? {
          primaryLabels: this.manualSelectionState.primaryMeshes.map(
            (m) => m.userData.label as string,
          ),
          clickedLabel: this.manualSelectionState.directlyClickedMesh
            ? (this.manualSelectionState.directlyClickedMesh.userData
                .label as string)
            : null,
          weights: this.manualSelectionState.selectionWeights,
        }
      : null;
  }

  /**
   * Restores the manual selection from the preserved state.
   */
  restoreManualSelection(
    preserved: PreservedManualSelection,
    pointCloud: PointCloud,
  ) {
    if (!preserved) {
      return;
    }

    const newPrimaryMeshes: THREE.Mesh[] = [];
    let newClickedMesh: THREE.Mesh | null = null;
    for (const mesh of pointCloud.getPointMeshes()) {
      if (preserved.primaryLabels.includes(mesh.userData.label)) {
        newPrimaryMeshes.push(mesh);
      }
      if (mesh.userData.label === preserved.clickedLabel) {
        newClickedMesh = mesh;
      }
    }

    if (newPrimaryMeshes.length > 0) {
      let neighborDistances = new Map<number, number>();
      if (this.options.includeHighDimensionalNeighbors) {
        const primaryVectors = newPrimaryMeshes.map((m) => m.userData.vector);
        const allVectors = pointCloud
          .getPointMeshes()
          .map((m) => m.userData.vector);
        neighborDistances =
          this.pointCloudGenerator.findHighDimensionalNeighbors(
            primaryVectors,
            allVectors,
            this.options.neighborRadius,
          );
      }
      this.manualSelectionState = {
        primaryMeshes: newPrimaryMeshes,
        selectionWeights: preserved.weights,
        directlyClickedMesh: newClickedMesh,
        neighborDistances,
      };
    }
  }
}
