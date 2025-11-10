/**
 * @fileoverview Control real time music with text prompts
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import '@material/web/all.js';

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {MD_STYLES} from './styles';

/**
 * The settings for the Space visualization.
 */
export interface SpaceSettings {
  pointCount: number;
  neighborRadius: number;
  includeHighDimensionalNeighbors: boolean;
  threeDClickRadius: number;
  randomizePoints: boolean;
  randomizeEmbeddings: boolean;
  nNeighbors: number;
  minDist: number;
  spread: number;
}

/**
 * A component for controlling Space settings.
 */
@customElement('space-settings')
export class SpaceSettingsComponent extends LitElement {
  static override styles = [
    MD_STYLES,
    css`
      :host {
        display: block;
        width: fit-content;
      }
      .flex-row {
        background: rgba(26, 26, 26, 0.5);
        display: flex;
        align-items: center;
        padding: 6px 0px;
        width: fit-content;
        gap: 16px;
      }
      .flex-row > * {
        margin: 0px 3px;
      }
      md-outlined-text-field {
        max-width: 130px;
      }
      .checkbox-label {
        display: flex;
        align-items: center;
        color: var(--md-sys-color-on-surface-variant);
        font-size: 14px;
        gap: 8px;
        white-space: nowrap;
        cursor: pointer;
      }
      .checkbox-label:hover {
        color: var(--md-sys-color-on-primary);
      }
      md-outlined-button {
        margin-left: 8px;
      }
    `,
  ];

  @property({type: Object}) settings!: SpaceSettings;

  private handleTextFieldBlur(e: FocusEvent) {
    const target = e.target as HTMLInputElement;
    const property = target.dataset['property'] as keyof SpaceSettings;
    if (!property || !this.settings || !(property in this.settings)) {
      console.error('failed to find space setting with property', property);
      return;
    }

    const value = Number(target.value);
    if (isNaN(value)) {
      // Revert to the old value if input is not a valid number.
      target.value = this.settings[property].toString();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('settings-changed', {
        bubbles: true,
        composed: true,
        detail: {property, value},
      }),
    );
  }

  private handleCheckboxChange(e: Event) {
    const target = e.target as HTMLInputElement & {checked: boolean};
    const property = target.dataset['property'] as keyof SpaceSettings;
    if (!property || !this.settings || !(property in this.settings)) {
      console.error('failed to find space setting with property', property);
      return;
    }

    this.dispatchEvent(
      new CustomEvent('settings-changed', {
        bubbles: true,
        composed: true,
        detail: {property, value: target.checked},
      }),
    );
  }

  private handleRenderClick() {
    this.dispatchEvent(
      new CustomEvent('render-space-clicked', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    if (!this.settings) {
      return html``;
    }
    return html`
      <div class="flex-row">
        <md-outlined-text-field
          label="Point Count"
          type="number"
          .value=${this.settings.pointCount.toString()}
          data-property="pointCount"
          @blur=${this.handleTextFieldBlur}></md-outlined-text-field>
        <md-outlined-text-field
          label="Neighbor Radius"
          type="number"
          step="0.05"
          .value=${this.settings.neighborRadius.toString()}
          data-property="neighborRadius"
          @blur=${this.handleTextFieldBlur}></md-outlined-text-field>
        <md-outlined-text-field
          label="3D Click Radius"
          type="number"
          step="0.1"
          .value=${this.settings.threeDClickRadius.toString()}
          data-property="threeDClickRadius"
          @blur=${this.handleTextFieldBlur}></md-outlined-text-field>
        <md-outlined-text-field
          label="UMAP Neighbors"
          type="number"
          .value=${this.settings.nNeighbors.toString()}
          data-property="nNeighbors"
          @blur=${this.handleTextFieldBlur}></md-outlined-text-field>
        <md-outlined-text-field
          label="UMAP Min Dist"
          type="number"
          step="0.05"
          .value=${this.settings.minDist.toString()}
          data-property="minDist"
          @blur=${this.handleTextFieldBlur}></md-outlined-text-field>
        <md-outlined-text-field
          label="UMAP Spread"
          type="number"
          step="0.05"
          .value=${this.settings.spread.toString()}
          data-property="spread"
          @blur=${this.handleTextFieldBlur}></md-outlined-text-field>
      </div>
      <div class="flex-row">
        <label class="checkbox-label">
          High Dim Neighbors
          <md-checkbox
            ?checked=${this.settings.includeHighDimensionalNeighbors}
            data-property="includeHighDimensionalNeighbors"
            @change=${this.handleCheckboxChange}></md-checkbox>
        </label>
        <label class="checkbox-label">
          Randomize Points
          <md-checkbox
            ?checked=${this.settings.randomizePoints}
            data-property="randomizePoints"
            @change=${this.handleCheckboxChange}></md-checkbox>
        </label>
        <label class="checkbox-label">
          Randomize Embeddings
          <md-checkbox
            ?checked=${this.settings.randomizeEmbeddings}
            data-property="randomizeEmbeddings"
            @change=${this.handleCheckboxChange}></md-checkbox>
        </label>
      </div>
      <div class="flex-row">
        <md-outlined-button @click=${this.handleRenderClick}
          >Render</md-outlined-button
        >
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'space-settings': SpaceSettingsComponent;
  }
}
