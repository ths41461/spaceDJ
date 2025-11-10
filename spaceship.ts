/**
 * @fileoverview Spaceship class for the SpaceDJ applet.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

const MOVE_SPEED = 0.03;
const ROTATION_SPEED = 0.02;
const AUTOPILOT_MAX_CENTER_DISTANCE = 40;
const AUTOPILOT_MIN_TARGET_DISTANCE = 5.0;
const AUTOPILOT_RANDOM_DESTINATION_PROBABILITY = 0.001;

/**
 * Represents the player-controlled spaceship in the scene.
 */
export class Spaceship {
  readonly mesh: THREE.Group;
  readonly occlusionHull: THREE.Mesh;

  private autopilotActive = false;
  private autopilotTime = 0;
  private autopilotTargetPosition: THREE.Vector3 | null = null;
  private autopilotTargetDestination: THREE.Vector3 | null = null;
  onAutopilotChanged?: (active: boolean) => void;

  constructor(cubeRenderTarget: THREE.WebGLCubeRenderTarget) {
    this.mesh = new THREE.Group();

    // Materials and colors
    const bodyColor = 0xcccccc; // Lighter grey for a metallic look
    const bodyMetalness = 0.9; // Increased for more shine
    const bodyRoughness = 0.2; // Smoother, more reflective surface
    const bodyEmissive = 0x111111; // Slightly glowing body
    const bodyEmissiveIntensity = 0.2; // Control the glow's strength
    const cockpitColor = 0xcccccc; // Lighter grey for a metallic look
    const cockpitRoughness = 0.1;
    const cockpitMetalness = 0.2;
    const cockpitOpacity = 0.8;

    const tieMaterial = new THREE.MeshStandardMaterial({
      color: bodyColor,
      metalness: bodyMetalness,
      roughness: bodyRoughness,
      emissive: bodyEmissive,
      emissiveIntensity: bodyEmissiveIntensity,
    });

    const engineGlowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5500, // Bright red glow
    });

    const cockpitWindowMaterial = new THREE.MeshStandardMaterial({
      color: cockpitColor,
      roughness: cockpitRoughness, 
      metalness: cockpitMetalness,
      transparent: true,
      opacity: cockpitOpacity,
      envMap: cubeRenderTarget.texture,
    });

    // Cockpit and hull
    const cockpitGroup = new THREE.Group();

    // Spherical cockpit
    const cockpitGeom = new THREE.SphereGeometry(1, 32, 32);
    const cockpit = new THREE.Mesh(cockpitGeom, tieMaterial);
    cockpitGroup.add(cockpit);

    // Circular viewport using a cylinder
    const viewportGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 32);
    const viewport = new THREE.Mesh(viewportGeom, cockpitWindowMaterial);
    viewport.rotation.x = Math.PI / 2;
    viewport.position.z = 0.95;
    cockpitGroup.add(viewport);

    // Pylons connecting to wings
    const pylonGeom = new THREE.CylinderGeometry(0.15, 0.15, 3.0, 12);
    const pylon = new THREE.Mesh(pylonGeom, tieMaterial);
    pylon.rotation.z = Math.PI / 2;
    cockpitGroup.add(pylon);

    this.mesh.add(cockpitGroup);

    // Rear section
    const rearSection = new THREE.Group();
    const rearBodyGeom = new THREE.BoxGeometry(1.5, 0.8, 2);
    const rearBody = new THREE.Mesh(rearBodyGeom, tieMaterial);
    rearBody.position.z = -1.5;
    rearSection.add(rearBody);

    // Engine housing, nozzle, and glow
    const engineHousingGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.25, 16);
    const engineNozzleGeom = new THREE.TorusGeometry(0.35, 0.06, 8, 24);
    const engineGlowGeom = new THREE.CircleGeometry(0.5, 16);

    const createEngine = () => {
      const engine = new THREE.Group();
      const housing = new THREE.Mesh(engineHousingGeom, tieMaterial);
      const nozzle = new THREE.Mesh(engineNozzleGeom, tieMaterial);
      nozzle.rotation.x = Math.PI / 2;
      nozzle.position.z = 0.1;
      const glow = new THREE.Mesh(engineGlowGeom, engineGlowMaterial);
      glow.position.z = 0.11;
      glow.rotation.x = Math.PI / 2;

      engine.add(housing, nozzle, glow);
      return engine;
    }

    const leftEngine = createEngine();
    leftEngine.position.set(-0.5, 0, -2.5);
    leftEngine.rotation.x = Math.PI / 2;
    rearSection.add(leftEngine);

    const rightEngine = createEngine();
    rightEngine.position.set(0.5, 0, -2.5);
    rightEngine.rotation.x = Math.PI / 2;
    rearSection.add(rightEngine);

    this.mesh.add(rearSection);

    // Wings
    const createWing = (envMap: THREE.Texture | null) => {
      const wing = new THREE.Group();
      const wingMaterial = new THREE.MeshStandardMaterial({
        color: bodyColor,
        metalness: bodyMetalness,
        roughness: bodyRoughness,
        emissive: bodyEmissive,
        emissiveIntensity: bodyEmissiveIntensity,
        envMap,
      });

      // A wing is a large, flat panel.
      const panelShape = new THREE.Shape();
      const panelHeight = 2.5;
      const panelWidth = 2.0;
      const panelTaper = 1;

      panelShape.moveTo(0, -panelHeight);
      panelShape.lineTo(panelWidth, -panelHeight + panelTaper);
      panelShape.lineTo(panelWidth, panelHeight - panelTaper);
      panelShape.lineTo(0, panelHeight);
      panelShape.lineTo(0, -panelHeight);

      const extrudeSettings = {depth: 0.1, bevelEnabled: false};
      const panelGeom = new THREE.ExtrudeGeometry(panelShape, extrudeSettings);

      const innerPanel = new THREE.Mesh(panelGeom, wingMaterial);
      wing.add(innerPanel);

      // Add panel lines for detail
      const lineMaterial = new THREE.MeshBasicMaterial({color: 0x1a1a1a});
      for (let i = -0.5; i <= 0.5; i += 0.5) {
        const lineGeom = new THREE.BoxGeometry(panelWidth, 0.2, 0.2);
        const line = new THREE.Mesh(lineGeom, lineMaterial);
        line.position.y = i;
        line.position.x = -panelWidth;
        wing.add(line);
      }
      return wing;
    };

    const rightWing = createWing(cubeRenderTarget.texture);
    rightWing.position.set(1.5, 0, 0);
    this.mesh.add(rightWing);

    const leftWing = createWing(cubeRenderTarget.texture);
    leftWing.position.set(-1.5, 0, 0);
    leftWing.rotation.y = Math.PI; // Mirror the wing
    this.mesh.add(leftWing);

    // Create an invisible cone hull for occlusion checks.
    const coneRadius = 6;
    const coneHeight = 500;
    const occlusionHullGeom = new THREE.ConeGeometry(
      coneRadius,
      coneHeight,
      16,
    );
    occlusionHullGeom.translate(0, coneHeight / 2, 0);
    const occlusionHullMat = new THREE.MeshBasicMaterial({
      visible: false,
      wireframe: true,
    });
    this.occlusionHull = new THREE.Mesh(occlusionHullGeom, occlusionHullMat);
    this.occlusionHull.rotation.x = Math.PI / 2;
    this.occlusionHull.position.z = -1;
    this.mesh.add(this.occlusionHull);

    this.mesh.rotation.y = Math.PI;
    this.mesh.scale.set(0.12, 0.12, 0.12);
  }

  /**
   * Toggles the autopilot mode.
   *
   * @return The current autopilot mode.
   */
  toggleAutopilot(): boolean {
    this.autopilotActive = !this.autopilotActive;
    if (this.onAutopilotChanged) {
      this.onAutopilotChanged(this.autopilotActive);
    }
    if (!this.autopilotActive) {
      this.resetAutopilotTarget();
    }
    return this.autopilotActive;
  }

  /**
   * Resets the autopilot target position and destination.
   */
  resetAutopilotTarget() {
    this.autopilotTargetPosition = null;
    this.autopilotTargetDestination = null;
  }

  /**
   * Updates the spaceship position based on the current state.
   *
   * @param keysPressed The set of keys pressed.
   * @param pointsGroup The group of points.
   * @param pointMeshes The meshes of the points.
   */
  updatePosition(
    keysPressed: Set<string>,
    pointsGroup?: THREE.Group,
    pointMeshes?: THREE.Mesh[],
  ) {
    if (
      this.autopilotActive &&
      (keysPressed.has('w') ||
        keysPressed.has('s') ||
        keysPressed.has('a') ||
        keysPressed.has('d') ||
        keysPressed.has('arrowup') ||
        keysPressed.has('arrowdown') ||
        keysPressed.has('arrowleft') ||
        keysPressed.has('arrowright'))
    ) {
      this.autopilotActive = false;
      this.resetAutopilotTarget();
      if (this.onAutopilotChanged) {
        this.onAutopilotChanged(this.autopilotActive);
      }
    }

    if (this.autopilotActive) {
      this.updateAutopilot(pointsGroup, pointMeshes);
    } else {
      this.updateManualPosition(keysPressed);
    }
  }

  private updateAutopilot(
    pointsGroup?: THREE.Group,
    pointMeshes?: THREE.Mesh[],
  ) {
    if (!pointsGroup) return;

    this.autopilotTime += 0.001;
    const spaceshipMesh = this.mesh;

    spaceshipMesh.translateZ(MOVE_SPEED * 0.1);

    const sidewaysSpeed =
      Math.sin(this.autopilotTime * 0.4) * MOVE_SPEED * 0.05;
    spaceshipMesh.translateX(sidewaysSpeed);

    const boundingBox = new THREE.Box3().setFromObject(pointsGroup);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const distanceToCenter = spaceshipMesh.position.distanceTo(center);
    const distanceToDestination = this.autopilotTargetDestination
      ? spaceshipMesh.position.distanceTo(this.autopilotTargetDestination)
      : Infinity;

    // If we are too far, have reached the destination, or randomly, pick a new
    // destination to move towards.
    if (
      this.autopilotTargetDestination === null ||
      distanceToCenter > AUTOPILOT_MAX_CENTER_DISTANCE ||
      distanceToDestination < AUTOPILOT_MIN_TARGET_DISTANCE ||
      Math.random() < AUTOPILOT_RANDOM_DESTINATION_PROBABILITY
    ) {
      if (pointMeshes && pointMeshes.length > 0) {
        const randomIndex = Math.floor(Math.random() * pointMeshes.length);
        const randomPointMesh = pointMeshes[randomIndex]!;
        if (randomPointMesh.parent) {
          this.autopilotTargetDestination =
            randomPointMesh.parent.position.clone();
        }
      } else {
        this.autopilotTargetDestination = new THREE.Vector3(
          THREE.MathUtils.randFloat(boundingBox.min.x, boundingBox.max.x),
          THREE.MathUtils.randFloat(boundingBox.min.y, boundingBox.max.y),
          THREE.MathUtils.randFloat(boundingBox.min.z, boundingBox.max.z),
        );
      }
      // If this is the first time, snap the current target to the destination.
      if (
        this.autopilotTargetPosition === null &&
        this.autopilotTargetDestination
      ) {
        this.autopilotTargetPosition = this.autopilotTargetDestination.clone();
      }
    }

    // Smoothly move the current look-at target towards the destination target.
    if (this.autopilotTargetPosition && this.autopilotTargetDestination) {
      this.autopilotTargetPosition.lerp(this.autopilotTargetDestination, 0.002);
    } else if (!this.autopilotTargetPosition) {
      return;
    }

    // To get the target quaternion, we can use a temporary matrix.
    // This creates a rotation matrix that orients the object's +Z axis towards
    // the target.
    const lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(
      this.autopilotTargetPosition,
      spaceshipMesh.position,
      spaceshipMesh.up,
    );
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
      lookAtMatrix,
    );

    // Smooth rotation towards the target quaternion.
    spaceshipMesh.quaternion.slerp(targetQuaternion, 0.003);
  }

  private updateManualPosition(keysPressed: Set<string>) {
    // Movement
    if (keysPressed.has('w')) {
      this.mesh.translateZ(MOVE_SPEED);
    }
    if (keysPressed.has('s')) {
      this.mesh.translateZ(-MOVE_SPEED);
    }
    if (keysPressed.has('a')) {
      this.mesh.translateX(MOVE_SPEED);
    }
    if (keysPressed.has('d')) {
      this.mesh.translateX(-MOVE_SPEED);
    }

    // Rotation
    const worldUp = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(
      this.mesh.quaternion,
    );
    const pitchAngle = forward.angleTo(worldUp);
    const pitchUpLimit = THREE.MathUtils.degToRad(5);
    const pitchDownLimit = THREE.MathUtils.degToRad(160);

    if (keysPressed.has('arrowup')) {
      if (pitchAngle > pitchUpLimit) {
        this.mesh.rotateX(-ROTATION_SPEED);
      }
    }
    if (keysPressed.has('arrowdown')) {
      if (pitchAngle < pitchDownLimit) {
        this.mesh.rotateX(ROTATION_SPEED);
      }
    }
    if (keysPressed.has('arrowleft')) {
      const q = new THREE.Quaternion().setFromAxisAngle(
        worldUp,
        ROTATION_SPEED,
      );
      this.mesh.quaternion.premultiply(q);
    }
    if (keysPressed.has('arrowright')) {
      const q = new THREE.Quaternion().setFromAxisAngle(
        worldUp,
        -ROTATION_SPEED,
      );
      this.mesh.quaternion.premultiply(q);
    }
  }

  /**
   * Returns the spaceship mesh.
   */
  getMesh(): THREE.Group {
    return this.mesh;
  }
}
