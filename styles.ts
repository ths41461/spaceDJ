/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css} from 'lit';

/**
 * Styles for the space-dj component. We resort to using a TS file as a
 * workaround for the lack of tooling for bundling CSS.
 */
export const SPACE_DJ_STYLES = css`
  :host {
    position: relative;
    padding: 0 12px;
    background-color: #1a1a1a;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    --md-sys-color-primary: #007da3;
    --md-sys-color-on-primary: #fff;
    --md-sys-color-on-surface-variant: #a1a1a1;
  }
  h1 {
    font-size: 40px;
    margin: 20px 0;
    color: #a1a1a1;
  }
  .header {
    display: flex;
    flex-direction: column;
    padding: 0 24px;
    position: absolute;
    top: 0;
    left: 12px;
    right: 12px;
    z-index: 1000;
    background: linear-gradient(
      to bottom,
      rgba(26, 26, 26, 0.7) 0%,
      rgba(26, 26, 26, 0) 100%
    );
  }
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .controls {
    display: flex;
    gap: 4px;
    align-items: center;
  }
  .container {
    width: fit-content;
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    gap: 1vmin;
  }
  .flex-row {
    display: flex;
    align-items: center;
    padding: 4px 0px;
  }
  .flex-row > * {
    margin: 0px 3px;
  }
  .container md-outlined-text-field {
    max-width: 120px;
  }
  play-pause-button,
  reset-button,
  settings-button,
  close-button,
  collapse-button,
  info-button,
  loading-icon,
  autopilot-button,
  vocals-button {
    height: 8vmin;
    width: 8vmin;
  }
  md-outlined-select {
    margin-top: 16px;
    max-width: 200px;
  }
  .prompt-overlay {
    transition: all 0.3s ease-in-out;
  }
  .prompt-overlay.collapsed {
    padding: 0;
    max-height: 48px;
    overflow: hidden;
  }
  .prompt-overlay-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .prompt-overlay.collapsed .prompt-overlay-header {
    padding: 0 6px 0 24px;
    height: 100%;
    margin-bottom: 0;
    gap: 8px;
  }
  .prompt-overlay-header h2 {
    margin: 0;
    font-size: 16px;
    color: #a1a1a1;
    letter-spacing: 0.5px;
  }
  .prompt-overlay-header collapse-button {
    width: 36px;
    height: 36px;
  }
  .loading-icon-container {
    width: 36px;
    height: 36px;
    transition: all 0.3s ease-in-out;
  }
  .prompt-overlay.collapsed .loading-icon-container.hidden {
    width: 0;
    height: 0;
    overflow: hidden;
  }
  .prompt-overlay-header loading-icon {
    width: 100%;
    height: 100%;
  }
  .prompt-overlay {
    position: absolute;
    bottom: 24px;
    left: 24px;
    background-color: rgba(26, 26, 26, 0.7);
    color: #e0e0e0;
    padding: 12px 24px;
    border-radius: 12px;
    z-index: 1001;
    max-width: 400px;
    max-height: 30vh;
    overflow-y: auto;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .prompt-item {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
  }
  .prompt-text {
    margin-right: 24px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .prompt-weight {
    font-weight: bold;
    color: #fff;
    min-width: 40px;
    text-align: right;
  }
  md-outlined-select {
    background: rgba(26, 26, 26, 0.5);
  }
  .info-overlay {
    background-color: rgba(26, 26, 26, 0.7);
    color: #e0e0e0;
    padding: 12px 24px;
    border-radius: 12px;
    z-index: 1001;
    max-height: 35vh;
    max-width: 50%;
    overflow-y: auto;
    backdrop-filter: blur(4px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition:
      all 0.3s ease-in-out,
      background-color 0s,
      backdrop-filter 0s;
  }
  .info-overlay.collapsed {
    padding: 0;
    overflow: hidden;
    border: none;
    background-color: transparent;
    backdrop-filter: none;
  }
  .info-overlay-header {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .info-overlay.collapsed .info-overlay-header {
    height: 100%;
    margin-bottom: 0;
  }
  .info-overlay-header info-button.uncollapsed {
    width: 6vmin;
    height: 6vmin;
  }
  .info-item {
    display: flex;
    flex-direction: column;
    margin-bottom: 12px;
    font-size: 14px;
  }
  .info-item:last-child {
    margin-bottom: 0;
  }
  .info-item-title {
    font-weight: bold;
    color: #fff;
    margin-bottom: 4px;
  }
  code {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: monospace;
  }
  .controls-overlay {
    position: absolute;
    bottom: 0vh;
    width: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(
      to top,
      rgba(26, 26, 26, 0.7) 0%,
      rgba(26, 26, 26, 0) 100%
    );
    z-index: 1000;
    opacity: 1;
    visibility: visible;
    transition:
      opacity 0.3s ease-in-out,
      visibility 0s ease-in-out;
  }
  .controls-overlay.hidden {
    opacity: 0;
    visibility: hidden;
    transition:
      opacity 0.3s ease-in-out,
      visibility 0s 0.3s;
  }
  .controls-overlay.first-dismissal.hidden {
    transition:
      opacity 5s ease-in-out,
      visibility 0s 5s;
  }
  .control-overlay-items-container.hidden {
    display: none;
  }
  .close-controls-button {
    cursor: pointer;
    z-index: 1001;
    pointer-events: all;
    align-self: flex-start;
    transform: scale(2);
  }
  .close-controls-button:hover {
    fill: #fff;
  }
  .close-controls-button.space-only {
    /* vertically aligns control-items */
    visibility: hidden;
  }
  .control-overlay-header {
    margin: -24px 0 24px 0;
    font-size: 24px;
    color: #a1a1a1;
    display: flex;
    justify-content: center;
  }
  a {
    color: #a0e9ff;
  }
  .control-overlay-items-container {
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
    z-index: 1000;
    opacity: 1;
  }
  .control-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
    transform: scale(0.5);
    margin: -48px;
  }
  .control-item span {
    color: #a1a1a1;
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    transform: scale(1.5);
  }
  .show-controls-button {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 8px;
    bottom: 24px;
    right: 24px;
    z-index: 1001;
  }
  .show-controls-button.hidden {
    display: none;
  }
`;

/**
 * Common styles for Material Design components.
 */
export const MD_STYLES = css`
  md-outlined-text-field {
    --md-outlined-text-field-input-text-color: #e0e0e0;
    --md-outlined-text-field-label-text-color: var(
      --md-sys-color-on-surface-variant
    );
    --md-outlined-text-field-outline-color: var(
      --md-sys-color-on-surface-variant
    );
    --md-outlined-text-field-hover-label-text-color: var(
      --md-sys-color-on-primary
    );
    --md-outlined-text-field-hover-outline-color: var(
      --md-sys-color-on-primary
    );
    --md-outlined-text-field-hover-input-text-color: #e0e0e0;
    --md-outlined-text-field-focus-outline-color: var(--md-sys-color-primary);
    --md-outlined-text-field-focus-label-text-color: var(
      --md-sys-color-on-primary
    );
    --md-outlined-text-field-caret-color: var(--md-sys-color-primary);
    --md-outlined-text-field-focus-caret-color: var(--md-sys-color-primary);
    --md-outlined-text-field-focus-input-text-color: #e0e0e0;
  }

  md-outlined-select {
    --md-outlined-select-text-field-container-shape: 4px;
    --md-outlined-select-text-field-container-color: #1a1a1a;
    --md-outlined-select-text-field-input-text-color: #e0e0e0;
    --md-outlined-select-text-field-supporting-text-color: #e0e0e0;
    --md-outlined-select-text-field-label-text-color: #a1a1a1;
    --md-outlined-select-text-field-outline-color: #a1a1a1;
    --md-outlined-select-text-field-caret-color: var(--md-sys-color-primary);
    --md-outlined-select-text-field-hover-label-text-color: #fff;
    --md-outlined-select-text-field-hover-outline-color: #fff;
    --md-outlined-select-text-field-hover-input-text-color: #e0e0e0;
    --md-outlined-select-text-field-focus-outline-color: var(
      --md-sys-color-primary
    );
    --md-outlined-select-text-field-focus-label-text-color: #fff;
    --md-outlined-select-text-field-focus-caret-color: var(
      --md-sys-color-primary
    );
    --md-outlined-select-text-field-focus-input-text-color: #e0e0e0;
    --md-menu-container-color: #2a2a2a;
    --md-menu-item-label-text-color: #e0e0e0;
    --md-menu-item-hover-state-layer-color: #fff;
    --md-menu-item-hover-state-layer-opacity: 0.1;
    --md-menu-item-focus-state-layer-color: #fff;
    --md-menu-item-focus-state-layer-opacity: 0.15;
    --md-menu-item-selected-container-color: var(--md-sys-color-primary);
    --md-menu-item-selected-label-text-color: var(--md-sys-color-on-primary);
  }

  md-outlined-button {
    --md-outlined-button-container-shape: 4px;
    --md-outlined-button-label-text-color: var(
      --md-sys-color-on-surface-variant
    );
    --md-outlined-button-outline-color: var(--md-sys-color-on-surface-variant);
    --md-outlined-button-hover-label-text-color: var(--md-sys-color-on-primary);
    --md-outlined-button-hover-state-layer-color: var(
      --md-sys-color-on-primary
    );
    --md-outlined-button-hover-state-layer-opacity: 0.08;
    --md-outlined-button-focus-label-text-color: var(--md-sys-color-on-primary);
    --md-outlined-button-focus-state-layer-color: var(--md-sys-color-primary);
    --md-outlined-button-focus-state-layer-opacity: 0.1;
    --md-outlined-button-pressed-state-label-text-color: var(
      --md-sys-color-on-primary
    );
    --md-outlined-button-pressed-state-layer-color: var(--md-sys-color-primary);
    --md-outlined-button-pressed-state-layer-opacity: 0.1;
    --md-outlined-button-pressed-outline-color: var(--md-sys-color-primary);
  }

  md-checkbox {
    --md-checkbox-outline-color: var(--md-sys-color-on-surface-variant);
    --md-checkbox-selected-container-color: var(--md-sys-color-primary);
    --md-checkbox-selected-icon-color: var(--md-sys-color-on-primary);
    --md-checkbox-hover-outline-color: var(--md-sys-color-on-primary);
    --md-checkbox-pressed-outline-color: var(--md-sys-color-on-primary);
    --md-checkbox-focus-outline-color: var(--md-sys-color-on-primary);
    --md-checkbox-hover-state-layer-color: var(--md-sys-color-primary);
    --md-checkbox-selected-hover-state-layer-color: var(--md-sys-color-primary);
    --md-checkbox-selected-hover-container-color: var(--md-sys-color-primary);
    --md-checkbox-selected-pressed-container-color: var(--md-sys-color-primary);
    --md-checkbox-focus-state-layer-color: var(--md-sys-color-primary);
    --md-checkbox-selected-focus-state-layer-color: var(--md-sys-color-primary);
    --md-checkbox-pressed-state-layer-color: var(--md-sys-color-primary);
    --md-checkbox-selected-pressed-state-layer-color: var(
      --md-sys-color-primary
    );
  }
`;
