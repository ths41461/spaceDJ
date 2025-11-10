/**
 * @fileoverview Tooltip component.
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, html, LitElement} from 'lit';
import {customElement, property} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';

/** Tooltip position. */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * A tooltip component that wraps content and shows a tooltip message on hover.
 */
@customElement('tooltip-message')
export class TooltipMessage extends LitElement {
  static override styles = css`
    .tooltip-container {
      position: relative;
      display: inline-block;
    }
    .tooltip {
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.3s;
      cursor: pointer;
      position: absolute;
      z-index: 1000;
      background-color: #1a1a1a;
      color: white;
      text-align: center;
      padding: 8px 12px;
      border-radius: 4px;
      white-space: nowrap;
      font-size: 14px;
      line-height: 1.4;

      &.top {
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
      }
      &.bottom {
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
      }
      &.left {
        right: 100%;
        top: 50%;
        transform: translateY(-50%);
      }
      &.right {
        left: 100%;
        top: 50%;
        transform: translateY(-50%);
      }
      &.showing {
        visibility: visible;
        opacity: 1;
      }

      /* Tooltip arrow */
      &::after {
        content: '';
        position: absolute;
        border-width: 8px;
        border-style: solid;
      }
      &.top::after {
        top: 100%;
        left: 50%;
        margin-left: -8px;
        border-color: #1a1a1a transparent transparent transparent;
      }
      &.bottom::after {
        bottom: 100%;
        left: 50%;
        margin-left: -8px;
        border-color: transparent transparent #1a1a1a transparent;
      }
      &.left::after {
        top: 50%;
        left: 100%;
        margin-top: -8px;
        border-color: transparent transparent transparent #1a1a1a;
      }
      &.right::after {
        top: 50%;
        right: 100%;
        margin-top: -8px;
        border-color: transparent #1a1a1a transparent transparent;
      }
    }
  `;

  @property({type: String}) message = '';
  @property({type: Boolean}) showing = false;
  @property({type: String}) position: TooltipPosition = 'top';

  override render() {
    const classes = {
      'tooltip': true,
      'showing': this.showing,
      [this.position]: true,
    };
    return html`
      <div
        class="tooltip-container"
        @mouseenter=${this.show}
        @mouseleave=${this.hide}>
        <slot></slot>
        <div
          class=${classMap(classes)}
          @click=${this.handleClick}>
          ${this.message}
        </div>
      </div>
    `;
  }

  show() {
    if (!this.message) {
      return;
    }
    this.showing = true;
  }

  hide() {
    this.showing = false;
  }

  private handleClick(event: MouseEvent) {
    event.stopPropagation();
    const slot = this.shadowRoot!.querySelector('slot')!;
    const slotted = slot.assignedElements()[0];
    if (slotted) {
      slotted.dispatchEvent(new MouseEvent('click', event));
    }
    this.showing = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tooltip-message': TooltipMessage;
  }
}
