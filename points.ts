/**
 * @fileoverview Manages high-dimensional embeddings, UMAP, point cloud data generation, and the visual point cloud in the THREE.js scene.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {CSS2DObject} from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {UMAP} from 'umap-js';
import {SpatialGrid} from './grid';
import {LabelRenderer} from './labels';
import {cosineDistance} from './utils';

/**
 * Parameters for UMAP.
 */
export interface UmapParameters {
  nNeighbors: number;
  minDist: number;
  spread: number;
}

/**
 * Represents a point in the 3D space with its associated data.
 */
export interface PointCloudData {
  position: THREE.Vector3;
  label: string;
  highDimVector: number[];
  index: number;
}
// Returns a pseudorandom number generator function based on the given seed.
// This is a simple implementation of the mulberry32 function that produces
// numbers uniformly distributed between 0 and 1.
function mulberry32(seed: number) {
  return function(): number {
    var t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

/**
 * Manages embeddings, UMAP, and the generation of point cloud data for visualization.
 */
export class PointCloudGenerator {
  private readonly rngFn: () => number;

  constructor(
    private readonly embeddingsCache: Map<string, number[]>,
    readonly rngSeed: number,
  ) {
    this.rngFn = mulberry32(rngSeed);
  }

  private shuffleEmbeddings(embeddings: Array<[string, number[]]>) {
    for (let i = embeddings.length - 1; i > 0; i--) {
      const j = Math.floor(this.rngFn() * (i + 1));
      [embeddings[i], embeddings[j]] = [embeddings[j], embeddings[i]];
    }
  }

  /**
   * Generates point cloud data for visualization.
   *
   * @param pointCount The number of points to generate.
   * @param embeddingDimensions The number of dimensions in the embedding.
   * @param randomizeEmbeddings Whether to randomize the embeddings.
   * @param umapParameters The parameters for UMAP.
   * @param currentSelectedEmbeddings The current selected embeddings.
   * @return The point cloud data and the selected embeddings.
   */
  generatePointCloudData(
    pointCount: number,
    embeddingDimensions: number,
    randomizeEmbeddings: boolean,
    umapParameters: UmapParameters,
    currentSelectedEmbeddings: Array<[string, number[]]> = [],
  ): {data: PointCloudData[]; selectedEmbeddings: Array<[string, number[]]>} {
    const allEmbeddings = Array.from(this.embeddingsCache.entries());
    let selectedEmbeddings = [...currentSelectedEmbeddings];

    // Shuffle to get a random subset if needed.
    if (selectedEmbeddings.length === 0) {
      this.shuffleEmbeddings(allEmbeddings);
      selectedEmbeddings = allEmbeddings.slice(0, pointCount);
    }

    if (selectedEmbeddings.length > pointCount) {
      selectedEmbeddings = selectedEmbeddings.slice(0, pointCount);
    } else if (selectedEmbeddings.length < pointCount) {
      const selectedLabels = new Set(
        selectedEmbeddings.map(([label]) => label),
      );
      const newEmbeddings = allEmbeddings
        .filter(([label]) => !selectedLabels.has(label))
        .slice(0, pointCount - selectedEmbeddings.length);
      this.shuffleEmbeddings(newEmbeddings);
      selectedEmbeddings.push(...newEmbeddings);
    }

    const highDimData: number[][] = [];
    const labels: string[] = [];
    for (const [label, embedding] of selectedEmbeddings) {
      if (randomizeEmbeddings) {
        const randomEmbedding: number[] = [];
        for (let d = 0; d < embeddingDimensions; d++) {
          randomEmbedding.push(Math.random() * 2 - 1);
        }
        highDimData.push(randomEmbedding);
      } else {
        highDimData.push(embedding);
      }
      labels.push(label);
    }

    // Reduce dimensionality
    const umap = new UMAP({
      nComponents: 3,
      nNeighbors: umapParameters.nNeighbors,
      minDist: umapParameters.minDist,
      spread: umapParameters.spread,
      distanceFn: cosineDistance,
      random: this.rngFn,
    });
    const embeddings3D: number[][] = umap.fit(highDimData);

    const pointCloudData: PointCloudData[] = embeddings3D.map((pos, i) => ({
      position: new THREE.Vector3(pos[0] * 10, pos[1] * 10, pos[2] * 10),
      label: labels[i],
      highDimVector: highDimData[i],
      index: i,
    }));

    return {data: pointCloudData, selectedEmbeddings};
  }

  /**
   * Finds the high dimensional neighbors of the primary vectors.
   *
   * @param primaryVectors The primary vectors to find neighbors for.
   * @param allVectors The all vectors to find neighbors from.
   * @param neighborRadius The radius of the neighbors to find.
   * @return A map of the index of the neighbors to the distance to the primary
   * vector.
   */
  findHighDimensionalNeighbors(
    primaryVectors: number[][],
    allVectors: number[][],
    neighborRadius: number,
  ): Map<number, number> {
    const neighborDistances = new Map<number, number>();

    for (const primaryVector of primaryVectors) {
      for (const [i, pointVector] of allVectors.entries()) {
        if (primaryVectors === allVectors && primaryVector === pointVector) {
          continue;
        }
        const distance = cosineDistance(primaryVector, pointVector);
        if (distance <= neighborRadius) {
          const existingDistance = neighborDistances.get(i);
          if (existingDistance === undefined || distance < existingDistance) {
            neighborDistances.set(i, distance);
          }
        }
      }
    }
    return neighborDistances;
  }
}

const DEFAULT_COLOR = new THREE.Color(0x6e6e78); // Medium Gray
const DEFAULT_INTENSITY = 0.1;

/**
 * Manages the THREE.js objects representing the embeddings in the scene.
 */
export class PointCloud {
  private pointsGroup: THREE.Group | null = null;
  private pointMeshes: THREE.Mesh[] = [];
  private readonly spatialGrid: SpatialGrid;
  private readonly labelRenderer: LabelRenderer;

  constructor(private readonly pointCloudData: PointCloudData[]) {
    this.createMeshes();
    this.spatialGrid = new SpatialGrid(this.pointMeshes);
    this.labelRenderer = new LabelRenderer(this.pointMeshes);
  }

  private createMeshes(): void {
    this.pointsGroup = new THREE.Group();
    const pointGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const pointMaterial = new THREE.MeshStandardMaterial({
      color: DEFAULT_COLOR,
      emissive: DEFAULT_COLOR,
      emissiveIntensity: DEFAULT_INTENSITY,
      metalness: 0.2,
      roughness: 0.7,
    });

    for (const [i, pointData] of this.pointCloudData.entries()) {
      const pointObject = new THREE.Object3D();
      const pointMesh = new THREE.Mesh(pointGeometry, pointMaterial.clone());
      pointMesh.userData = {
        vector: pointData.highDimVector,
        label: pointData.label,
        index: i,
      };
      this.pointMeshes.push(pointMesh);
      pointObject.add(pointMesh);

      const labelDiv = document.createElement('div');
      labelDiv.className = 'label';
      labelDiv.textContent = pointData.label;
      const label = new CSS2DObject(labelDiv);
      label.position.set(0, 0.3, 0);
      pointObject.add(label);

      pointObject.position.copy(pointData.position);
      this.pointsGroup!.add(pointObject);
    }
  }

  /**
   * Returns the point meshes.
   */
  getPointMeshes(): THREE.Mesh[] {
    return this.pointMeshes;
  }

  /**
   * Returns the point cloud group.
   */
  getPointsGroup(): THREE.Group | null {
    return this.pointsGroup;
  }

  /**
   * Queries the spatial grid for meshes within the given radius of the given
   * position.
   */
  querySpatialGrid(position: THREE.Vector3, radius: number): THREE.Mesh[] {
    return this.spatialGrid.query(position, radius);
  }

  /**
   * Resets state and releases resources.
   */
  dispose(): void {
    if (this.pointsGroup) {
      this.pointsGroup.traverse((object: THREE.Object3D) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const material = object.material as THREE.Material | THREE.Material[];
          if (Array.isArray(material)) {
            for (const m of material) {
              m.dispose();
            }
          } else {
            material.dispose();
          }
        }
        if (object instanceof CSS2DObject) {
          object.element.remove();
        }
      });
      this.pointsGroup = null;
    }
    this.pointMeshes = [];
    this.spatialGrid.clear();
    this.labelRenderer.dispose();
  }

  /**
   * Updates the label visibilities.
   *
   * @param camera The camera used for label visibility.
   * @param spaceshipMesh The spaceship position.
   * @param occlusionHull The occlusion hull used to determine label visibility.
   * @param highlightedObjects The highlighted objects used for label visibility.
   * @param frameCount The frame count used for throttling.
   * @param labelUpdateThrottle The throttle used for label visibility.
   * @param labelSelectionConeDegrees The cone degrees used for label visibility.
   * @param labelSelectionConeHeight The cone height used for label visibility.
   * @param maxInViewLabels The maximum number of in view labels.
   * @param force Whether to force the label visibility update.
   *
   */
  updateLabelVisibilities(
    camera: THREE.Camera,
    spaceshipMesh: THREE.Group,
    occlusionHull: THREE.Mesh,
    highlightedObjects: THREE.Mesh[],
    frameCount: number,
    labelUpdateThrottle: number,
    labelSelectionConeDegrees: number,
    labelSelectionConeHeight: number,
    maxInViewLabels: number,
    force = false,
  ): void {
    this.labelRenderer.updateLabelVisibilities(
      camera,
      spaceshipMesh,
      occlusionHull,
      highlightedObjects,
      frameCount,
      labelUpdateThrottle,
      labelSelectionConeDegrees,
      labelSelectionConeHeight,
      maxInViewLabels,
      force,
    );
  }
}
