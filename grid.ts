/**
 * @fileoverview Spatial grid for optimizing spatial queries.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

const GRID_SIZE = 5.0; // World units

/**
 * A spatial grid for optimizing spatial queries.
 */
export class SpatialGrid {
  private readonly grid = new Map<string, THREE.Mesh[]>();

  constructor(pointMeshes: THREE.Mesh[]) {
    this.build(pointMeshes);
  }

  private getKey(position: THREE.Vector3): string {
    const gridX = Math.floor(position.x / GRID_SIZE);
    const gridY = Math.floor(position.y / GRID_SIZE);
    const gridZ = Math.floor(position.z / GRID_SIZE);
    return `${gridX}_${gridY}_${gridZ}`;
  }

  /**
   * Builds the spatial grid from the given point meshes.
   */
  build(pointMeshes: THREE.Mesh[]): void {
    this.grid.clear();
    for (const pointMesh of pointMeshes) {
      const pointObject = pointMesh.parent;
      if (!pointObject) {
        continue;
      }
      const key = this.getKey(pointObject.position);
      if (!this.grid.has(key)) {
        this.grid.set(key, []);
      }
      this.grid.get(key)!.push(pointMesh);
    }
  }

  /**
   * Queries the spatial grid for meshes within the given radius of the given
   * position.
   */
  query(position: THREE.Vector3, radius: number): THREE.Mesh[] {
    const radiusSq = radius * radius;
    const minX = Math.floor((position.x - radius) / GRID_SIZE);
    const maxX = Math.floor((position.x + radius) / GRID_SIZE);
    const minY = Math.floor((position.y - radius) / GRID_SIZE);
    const maxY = Math.floor((position.y + radius) / GRID_SIZE);
    const minZ = Math.floor((position.z - radius) / GRID_SIZE);
    const maxZ = Math.floor((position.z + radius) / GRID_SIZE);

    const nearbyMeshes: THREE.Mesh[] = [];
    const worldPosition = new THREE.Vector3();

    for (let i = minX; i <= maxX; i++) {
      for (let j = minY; j <= maxY; j++) {
        for (let k = minZ; k <= maxZ; k++) {
          const key = `${i}_${j}_${k}`;
          if (this.grid.has(key)) {
            for (const mesh of this.grid.get(key)!) {
              const pointObject = mesh.parent;
              if (!pointObject) continue;
              pointObject.getWorldPosition(worldPosition);
              if (position.distanceToSquared(worldPosition) < radiusSq) {
                nearbyMeshes.push(mesh);
              }
            }
          }
        }
      }
    }
    return nearbyMeshes;
  }

  /**
   * Clears the spatial grid.
   */
  clear(): void {
    this.grid.clear();
  }
}
