/**
 * @fileoverview Manages the display and visibility of labels in the 3D scene.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {CSS2DObject} from 'three/examples/jsm/renderers/CSS2DRenderer.js';

/**
 * Manages the display and visibility of labels in the 3D scene.
 */
export class LabelRenderer {
  private readonly pointsWithVisibleLabels = new Set<THREE.Mesh>();
  private readonly labelOcclusionRaycaster = new THREE.Raycaster();

  constructor(private readonly pointMeshes: THREE.Mesh[]) {}

  private isOccluded(
    mesh: THREE.Mesh,
    cameraPosition: THREE.Vector3,
    occluders: THREE.Object3D[],
  ): boolean {
    const pointObject = mesh.parent;
    if (!pointObject) {
      return true;
    }

    const worldPosition = new THREE.Vector3();
    pointObject.getWorldPosition(worldPosition);

    const distanceToCamera = worldPosition.distanceTo(cameraPosition);

    const direction = new THREE.Vector3()
      .subVectors(worldPosition, cameraPosition)
      .normalize();
    this.labelOcclusionRaycaster.set(cameraPosition, direction);
    const intersects = this.labelOcclusionRaycaster.intersectObjects(
      occluders,
      false,
    );
    return (
      intersects.length > 0 && intersects[0].distance < distanceToCamera - 0.05
    );
  }

  private getLabel(mesh: THREE.Mesh): CSS2DObject | undefined {
    return mesh.parent?.children.find(
      (c: THREE.Object3D) => c instanceof CSS2DObject,
    ) as CSS2DObject | undefined;
  }

  /**
   * Updates the visibility of labels in the 3D scene.
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
    highlightedObjects: THREE.Mesh[] = [],
    frameCount: number,
    labelUpdateThrottle: number,
    labelSelectionConeDegrees: number,
    labelSelectionConeHeight: number,
    maxInViewLabels: number,
    force = false,
  ): void {
    if (!force && frameCount % labelUpdateThrottle !== 0) {
      return;
    }

    const coneApex = new THREE.Vector3();
    const coneAxis = new THREE.Vector3();
    spaceshipMesh.getWorldPosition(coneApex);
    spaceshipMesh.getWorldDirection(coneAxis);

    const labelSelectionAngleTan = Math.tan(
      THREE.MathUtils.degToRad(labelSelectionConeDegrees),
    );

    const frustum = new THREE.Frustum();
    const cameraViewProjectionMatrix = new THREE.Matrix4();
    cameraViewProjectionMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);

    const cameraPosition = camera.position;
    const occluders = [occlusionHull];

    const candidates: Array<{mesh: THREE.Mesh; distance: number}> = [];
    for (const mesh of this.pointMeshes) {
      if (highlightedObjects.includes(mesh)) continue;

      const pointObject = mesh.parent;
      if (!pointObject) continue;

      const worldPosition = new THREE.Vector3();
      pointObject.getWorldPosition(worldPosition);
      if (!frustum.containsPoint(worldPosition)) {
        continue;
      }

      const toPoint = new THREE.Vector3().subVectors(worldPosition, coneApex);
      const projection = toPoint.dot(coneAxis);

      if (projection > 0 && projection < labelSelectionConeHeight) {
        const radiusAtProjection = projection * labelSelectionAngleTan;
        const distanceToAxisSq = toPoint.lengthSq() - projection * projection;

        if (distanceToAxisSq < radiusAtProjection * radiusAtProjection) {
          const distanceToCamera = worldPosition.distanceTo(cameraPosition);
          if (!this.isOccluded(mesh, cameraPosition, occluders)) {
            candidates.push({mesh, distance: distanceToCamera});
          }
        }
      }
    }

    candidates.sort((a, b) => a.distance - b.distance);
    const inViewMeshes = new Set<THREE.Mesh>(
      candidates.slice(0, maxInViewLabels).map((c) => c.mesh),
    );

    const highlightedObjectsNotOccluded = highlightedObjects.filter((mesh) => {
      return !this.isOccluded(mesh, cameraPosition, occluders);
    });
    const newVisibleMeshes = new Set([
      ...inViewMeshes,
      ...highlightedObjectsNotOccluded,
    ]);

    for (const mesh of this.pointsWithVisibleLabels) {
      if (!newVisibleMeshes.has(mesh)) {
        const label = this.getLabel(mesh);
        if (label) {
          label.element.style.visibility = 'hidden';
        }
      }
    }

    for (const mesh of newVisibleMeshes) {
      const label = this.getLabel(mesh);
      if (label) {
        label.element.style.visibility = 'visible';
      }
    }
    this.pointsWithVisibleLabels.clear();

    for (const mesh of newVisibleMeshes) {
      this.pointsWithVisibleLabels.add(mesh);
    }
  }

  /**
   * Resets state and releases resources.
   */
  dispose(): void {
    this.pointsWithVisibleLabels.clear();
  }
}
