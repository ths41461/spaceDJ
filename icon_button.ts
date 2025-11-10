/**
 * @fileoverview Control real time music with text prompts
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {css, CSSResultGroup, html, LitElement, svg} from 'lit';
import {customElement, property} from 'lit/decorators.js';

type PlaybackState = 'stopped' | 'playing' | 'paused' | 'loading';

// Base class for icon buttons.
class IconButton extends LitElement {
  static override styles = css`
    :host {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }
    :host(:hover) svg {
      transform: scale(1.2);
    }
    svg {
      width: 100%;
      height: 100%;
      transition: transform 0.5s cubic-bezier(0.25, 1.56, 0.32, 0.99);
    }
    .hitbox {
      pointer-events: all;
      position: absolute;
      width: 65%;
      aspect-ratio: 1;
      top: 9%;
      border-radius: 50%;
      cursor: pointer;
    }
  ` as CSSResultGroup;

  // Method to be implemented by subclasses to provide the specific icon SVG
  protected renderIcon() {
    return svg``; // Default empty icon
  }

  private renderSVG() {
    return html` <svg
      width="140"
      height="140"
      viewBox="0 -10 140 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <rect
        x="22"
        y="6"
        width="96"
        height="96"
        rx="48"
        fill="black"
        fill-opacity="0.05" />
      <rect
        x="23.5"
        y="7.5"
        width="93"
        height="93"
        rx="46.5"
        stroke="black"
        stroke-opacity="0.3"
        stroke-width="3" />
      <g filter="url(#filter0_ddi_1048_7373)">
        <rect
          x="25"
          y="9"
          width="90"
          height="90"
          rx="45"
          fill="white"
          fill-opacity="0.05"
          shape-rendering="crispEdges" />
      </g>
      ${this.renderIcon()}
      <defs>
        <filter
          id="filter0_ddi_1048_7373"
          x="0"
          y="0"
          width="140"
          height="140"
          filterUnits="userSpaceOnUse"
          color-interpolation-filters="sRGB">
          <feFlood flood-opacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha" />
          <feOffset dy="2" />
          <feGaussianBlur stdDeviation="4" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_1048_7373" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha" />
          <feOffset dy="16" />
          <feGaussianBlur stdDeviation="12.5" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0" />
          <feBlend
            mode="normal"
            in2="effect1_dropShadow_1048_7373"
            result="effect2_dropShadow_1048_7373" />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect2_dropShadow_1048_7373"
            result="shape" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha" />
          <feOffset dy="3" />
          <feGaussianBlur stdDeviation="1.5" />
          <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0" />
          <feBlend
            mode="normal"
            in2="shape"
            result="effect3_innerShadow_1048_7373" />
        </filter>
      </defs>
    </svg>`;
  }

  override render() {
    return html`${this.renderSVG()} <div class="hitbox"></div>`;
  }
}

function renderLoading() {
  return svg`<path shape-rendering="crispEdges" class="loader" d="M70,74.2L70,74.2c-10.7,0-19.5-8.7-19.5-19.5l0,0c0-10.7,8.7-19.5,19.5-19.5l0,0c10.7,0,19.5,8.7,19.5,19.5l0,0"/>`;
}

// PlayPauseButton
// -----------------------------------------------------------------------------

/** A button for toggling play/pause. */
@customElement('play-pause-button')
export class PlayPauseButton extends IconButton {
  @property({type: String}) playbackState: PlaybackState = 'stopped';

  static override styles = [
    IconButton.styles,
    css`
      .loader {
        stroke: #ffffff;
        stroke-width: 3;
        stroke-linecap: round;
        animation: spin linear 1s infinite;
        transform-origin: center;
        transform-box: fill-box;
      }
      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(359deg);
        }
      }
    `,
  ];

  private renderPause() {
    return svg`<path
      d="M75.0037 69V39H83.7537V69H75.0037ZM56.2537 69V39H65.0037V69H56.2537Z"
      fill="#FEFEFE"
    />`;
  }

  private renderPlay() {
    return svg`<path d="M60 71.5V36.5L87.5 54L60 71.5Z" fill="#FEFEFE" />`;
  }

  override renderIcon() {
    if (this.playbackState === 'playing') {
      return this.renderPause();
    } else if (this.playbackState === 'loading') {
      return renderLoading();
    } else {
      return this.renderPlay();
    }
  }
}

/** A button for resetting playback state. */
@customElement('reset-button')
export class ResetButton extends IconButton {
  private renderResetIcon() {
    return svg`<path fill="#fefefe" d="M71,77.1c-2.9,0-5.7-0.6-8.3-1.7s-4.8-2.6-6.7-4.5c-1.9-1.9-3.4-4.1-4.5-6.7c-1.1-2.6-1.7-5.3-1.7-8.3h4.7
      c0,4.6,1.6,8.5,4.8,11.7s7.1,4.8,11.7,4.8c4.6,0,8.5-1.6,11.7-4.8c3.2-3.2,4.8-7.1,4.8-11.7s-1.6-8.5-4.8-11.7
      c-3.2-3.2-7.1-4.8-11.7-4.8h-0.4l3.7,3.7L71,46.4L61.5,37l9.4-9.4l3.3,3.4l-3.7,3.7H71c2.9,0,5.7,0.6,8.3,1.7
      c2.6,1.1,4.8,2.6,6.7,4.5c1.9,1.9,3.4,4.1,4.5,6.7c1.1,2.6,1.7,5.3,1.7,8.3c0,2.9-0.6,5.7-1.7,8.3c-1.1,2.6-2.6,4.8-4.5,6.7
      s-4.1,3.4-6.7,4.5C76.7,76.5,73.9,77.1,71,77.1z"/>`;
  }

  override renderIcon() {
    return this.renderResetIcon();
  }
}

/** A button for opening the settings dialog. */
@customElement('settings-button')
export class SettingsButton extends IconButton {
  private renderSettingsIcon() {
    return svg`<g transform="translate(49, 33) scale(0.9)">
      <path
        fill="#fefefe"
        d="M43.454,18.443h-2.437c-0.453-1.766-1.16-3.42-2.082-4.933l1.752-1.756c0.473-0.473,0.733-1.104,0.733-1.774 c0-0.669-0.262-1.301-0.733-1.773l-2.92-2.917c-0.947-0.948-2.602-0.947-3.545-0.001l-1.826,1.815 C30.9,6.232,29.296,5.56,27.529,5.128V2.52c0-1.383-1.105-2.52-2.488-2.52h-4.128c-1.383,0-2.471,1.137-2.471,2.52v2.607 c-1.766,0.431-3.38,1.104-4.878,1.977l-1.825-1.815c-0.946-0.948-2.602-0.947-3.551-0.001L5.27,8.205 C4.802,8.672,4.535,9.318,4.535,9.978c0,0.669,0.259,1.299,0.733,1.772l1.752,1.76c-0.921,1.513-1.629,3.167-2.081,4.933H2.501 C1.117,18.443,0,19.555,0,20.935v4.125c0,1.384,1.117,2.471,2.501,2.471h2.438c0.452,1.766,1.159,3.43,2.079,4.943l-1.752,1.763 c-0.474,0.473-0.734,1.106-0.734,1.776s0.261,1.303,0.734,1.776l2.92,2.919c0.474,0.473,1.103,0.733,1.772,0.733 s1.299-0.261,1.773-0.733l1.833-1.816c1.498,0.873,3.112,1.545,4.878,1.978v2.604c0,1.383,1.088,2.498,2.471,2.498h4.128 c1.383,0,2.488-1.115,2.488-2.498v-2.605c1.767-0.432,3.371-1.104,4.869-1.977l1.817,1.812c0.474,0.475,1.104,0.735,1.775,0.735 c0.67,0,1.301-0.261,1.774-0.733l2.92-2.917c0.473-0.472,0.732-1.103,0.734-1.772c0-0.67-0.262-1.299-0.734-1.773l-1.75-1.77 c0.92-1.514,1.627-3.179,2.08-4.943h2.438c1.383,0,2.52-1.087,2.52-2.471v-4.125C45.973,19.555,44.837,18.443,43.454,18.443z M22.976,30.85c-4.378,0-7.928-3.517-7.928-7.852c0-4.338,3.55-7.85,7.928-7.85c4.379,0,7.931,3.512,7.931,7.85 C30.906,27.334,27.355,30.85,22.976,30.85z"
      ></path>
    </g>`;
  }

  override renderIcon() {
    return this.renderSettingsIcon();
  }
}

function renderCollapseIcon() {
  // chevron down
  return svg`<path d="M70 68.75L45.8397 44.5897L51.1603 39.25L70 58.0897L88.8397 39.25L94.1603 44.5897L70 68.75Z" fill="#fefefe"/>`;
}

/** A button for collapsing/expanding a panel. */
@customElement('collapse-button')
export class CollapseButton extends IconButton {
  @property({type: Boolean, reflect: true}) collapsed = false;

  private renderExpandIcon() {
    // chevron up
    return svg`<path d="M70 39.25L94.1603 63.4103L88.8397 68.75L70 49.9103L51.1603 68.75L45.8397 63.4103L70 39.25Z" fill="#fefefe"/>`;
  }

  override renderIcon() {
    return this.collapsed ? this.renderExpandIcon() : renderCollapseIcon();
  }
}

/** A button for starting an autopilot run. */
@customElement('autopilot-button')
export class AutopilotButton extends IconButton {
  @property({type: Boolean, reflect: true}) active = false;

  static override styles = [
    IconButton.styles,
    css`
      :host([active]) svg path {
        fill: var(--md-sys-color-primary);
      }
    `,
  ];

  private renderAutopilotIcon() {
    // Navigation icon from Material Symbols, scaled and centered.
    return svg`<g transform="translate(48, 32) scale(1.8)">
      <path
        fill="#fefefe"
        d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"
      />
    </g>`;
  }

  override renderIcon() {
    return this.renderAutopilotIcon();
  }
}

/** A button for showing information. */
@customElement('info-button')
export class InfoButton extends IconButton {
  @property({type: Boolean, reflect: true}) collapsed = false;

  private renderInfoIcon() {
    // Material Symbols "info" icon, just the 'i' part.
    return svg`<g transform="translate(40, 24.5) scale(2.5)">
      <path fill="#fefefe" d="M11 7h2v2h-2zm0 4h2v6h-2z" />
    </g>`;
  }

  override renderIcon() {
    return this.collapsed ? this.renderInfoIcon() : renderCollapseIcon();
  }
}

/** A button for toggling vocals. */
@customElement('vocals-button')
export class VocalsButton extends IconButton {
  @property({type: Boolean, reflect: true}) enabled = true;

  private renderMicIcon() {
    return svg`<g transform="translate(46, 30) scale(2)"><path fill="#fefefe" d="M12,2A3,3 0 0,0 9,5V11A3,3 0 0,0 12,14A3,3 0 0,0 15,11V5A3,3 0 0,0 12,2M19,11C19,14.53 16.39,17.43 13,17.92V21H11V17.92C7.61,17.43 5,14.53 5,11H7A5,5 0 0,0 12,16A5,5 0 0,0 17,11H19Z"/></g>`;
  }

  private renderMicOffIcon() {
    return svg`<g transform="translate(46, 30) scale(2)"><path fill="#fefefe" d="M19 11h-1.7c0 .7-.16 1.3-.43 1.9l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.71-1.39-3.1-3.1-3.1-1.71 0-3.1 1.39-3.1 3.1v.18l1.79 1.79zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z"/></g>`;
  }

  override renderIcon() {
    return this.enabled ? this.renderMicIcon() : this.renderMicOffIcon();
  }
}

/** A button for closing a component. */
@customElement('close-button')
export class CloseButton extends IconButton {
  override renderIcon() {
    // Material Symbols "close" icon, scaled and centered.
    return svg`<g transform="translate(52, 36) scale(1.5)">
      <path
        fill="#fefefe"
        d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
      /></g>`;
  }
}

/** A graphic for explaining movement controls. */
@customElement('wasd-icon')
export class WasdIcon extends LitElement {
  render() {
    return html`${svg`<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="470px"
   height="322px" viewBox="0 0 470 322" style="enable-background:new 0 0 470 322;" xml:space="preserve">
<style type="text/css">
  .st0{fill:#a1a1a1;}
</style>
<g id="Layer_1">
  <g>
    <g>
      <path class="st0" d="M273.5,150h-76c-8.8,0-16-7.2-16-16V58c0-8.8,7.2-16,16-16h76c8.8,0,16,7.2,16,16v76
        C289.5,142.8,282.3,150,273.5,150z M197.5,50c-4.4,0-8,3.6-8,8v76c0,4.4,3.6,8,8,8h76c4.4,0,8-3.6,8-8V58c0-4.4-3.6-8-8-8H197.5z
        "/>
    </g>
    <g>
      <path class="st0" d="M273.5,280h-76c-8.8,0-16-7.2-16-16v-76c0-8.8,7.2-16,16-16h76c8.8,0,16,7.2,16,16v76
        C289.5,272.8,282.3,280,273.5,280z M197.5,180c-4.4,0-8,3.6-8,8v76c0,4.4,3.6,8,8,8h76c4.4,0,8-3.6,8-8v-76c0-4.4-3.6-8-8-8
        H197.5z"/>
    </g>
    <g>
      <path class="st0" d="M403,280h-76c-8.8,0-16-7.2-16-16v-76c0-8.8,7.2-16,16-16h76c8.8,0,16,7.2,16,16v76
        C419,272.8,411.8,280,403,280z M327,180c-4.4,0-8,3.6-8,8v76c0,4.4,3.6,8,8,8h76c4.4,0,8-3.6,8-8v-76c0-4.4-3.6-8-8-8H327z"/>
    </g>
    <g>
      <path class="st0" d="M143,280H67c-8.8,0-16-7.2-16-16v-76c0-8.8,7.2-16,16-16h76c8.8,0,16,7.2,16,16v76
        C159,272.8,151.8,280,143,280z M67,180c-4.4,0-8,3.6-8,8v76c0,4.4,3.6,8,8,8h76c4.4,0,8-3.6,8-8v-76c0-4.4-3.6-8-8-8H67z"/>
    </g>
    <g>
      <path class="st0" d="M205.9,73.9h9.3l6.1,25l0.7,4.7h0.5l1-4.7l7.8-25h8.3l7.7,25l1,4.5h0.5l0.7-4.5l6-25h9.3l-11.5,44.6h-9
        l-7.6-26.9l-1-4.8h-0.5l-1,4.8l-8,26.9h-8.7L205.9,73.9z"/>
    </g>
    <g>
      <path class="st0" d="M225.8,247.2c-3-2.2-5.1-5.3-6.3-9.3l7.9-3.1c0.6,2.4,1.7,4.3,3.2,5.7c1.5,1.4,3.4,2.1,5.6,2.1
        c1.9,0,3.5-0.5,4.8-1.4c1.3-0.9,2-2.2,2-3.9s-0.6-3-1.9-4.1c-1.3-1.1-3.5-2.2-6.8-3.4l-2.7-1c-2.9-1-5.3-2.5-7.4-4.6
        c-2-2.1-3.1-4.6-3.1-7.8c0-2.3,0.6-4.4,1.8-6.4c1.2-1.9,2.9-3.4,5.1-4.5c2.2-1.1,4.7-1.7,7.5-1.7c4,0,7.2,0.9,9.5,2.8
        c2.3,1.9,3.9,4.1,4.8,6.6l-7.4,3.1c-0.5-1.4-1.3-2.5-2.4-3.5c-1.1-0.9-2.6-1.4-4.4-1.4c-1.8,0-3.3,0.4-4.5,1.3
        c-1.2,0.9-1.8,2-1.8,3.3c0,1.3,0.6,2.5,1.7,3.4c1.1,0.9,3,1.8,5.5,2.7l2.8,0.9c3.9,1.3,6.8,3.1,8.9,5.3c2.1,2.2,3.1,5,3.1,8.6
        c0,2.9-0.7,5.4-2.2,7.4c-1.5,2-3.4,3.5-5.8,4.5c-2.3,1-4.8,1.5-7.3,1.5C232.2,250.5,228.8,249.4,225.8,247.2z"/>
    </g>
    <g>
      <path class="st0" d="M348.1,204.9h15.1c4.7,0,8.7,0.9,12.1,2.8c3.4,1.9,6.1,4.5,8,7.8c1.9,3.4,2.8,7.2,2.8,11.6
        c0,4.4-0.9,8.3-2.8,11.6s-4.5,6-8,7.8c-3.4,1.9-7.5,2.8-12.1,2.8h-15.1V204.9z M362.8,241.5c4.8,0,8.5-1.3,11-3.8
        c2.5-2.6,3.8-6.1,3.8-10.5c0-4.4-1.3-7.9-3.8-10.5c-2.5-2.6-6.2-3.8-11-3.8h-6.3v28.7H362.8z"/>
    </g>
    <g>
      <path class="st0" d="M100.1,204.9h9.7l16.8,44.6h-9.3l-3.7-10.7H96.5l-3.7,10.7h-9.3L100.1,204.9z M110.8,231.1l-3.9-11.2
        l-1.6-5.4h-0.5l-1.6,5.4l-4,11.2H110.8z"/>
    </g>
  </g>
</g>
<g id="Layer_2">
</g>
</svg>`}`;
  }
}

/** A graphic for explaining rotation controls. */
@customElement('arrows-icon')
export class ArrowsIcon extends LitElement {
  render() {
    return html`${svg`
      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="470px"
   height="322px" viewBox="0 0 470 322" style="enable-background:new 0 0 470 322;" xml:space="preserve">
<style type="text/css">
  .st0{fill:#a1a1a1;}
</style>
<g id="Layer_1">
  <g>
    <g>
      <path class="st0" d="M273.5,150h-76c-8.8,0-16-7.2-16-16V58c0-8.8,7.2-16,16-16h76c8.8,0,16,7.2,16,16v76
        C289.5,142.8,282.3,150,273.5,150z M197.5,50c-4.4,0-8,3.6-8,8v76c0,4.4,3.6,8,8,8h76c4.4,0,8-3.6,8-8V58c0-4.4-3.6-8-8-8H197.5z
        "/>
    </g>
    <g>
      <path class="st0" d="M273.5,280h-76c-8.8,0-16-7.2-16-16v-76c0-8.8,7.2-16,16-16h76c8.8,0,16,7.2,16,16v76
        C289.5,272.8,282.3,280,273.5,280z M197.5,180c-4.4,0-8,3.6-8,8v76c0,4.4,3.6,8,8,8h76c4.4,0,8-3.6,8-8v-76c0-4.4-3.6-8-8-8
        H197.5z"/>
    </g>
    <g>
      <path class="st0" d="M403,280h-76c-8.8,0-16-7.2-16-16v-76c0-8.8,7.2-16,16-16h76c8.8,0,16,7.2,16,16v76
        C419,272.8,411.8,280,403,280z M327,180c-4.4,0-8,3.6-8,8v76c0,4.4,3.6,8,8,8h76c4.4,0,8-3.6,8-8v-76c0-4.4-3.6-8-8-8H327z"/>
    </g>
    <g>
      <path class="st0" d="M143,280H67c-8.8,0-16-7.2-16-16v-76c0-8.8,7.2-16,16-16h76c8.8,0,16,7.2,16,16v76
        C159,272.8,151.8,280,143,280z M67,180c-4.4,0-8,3.6-8,8v76c0,4.4,3.6,8,8,8h76c4.4,0,8-3.6,8-8v-76c0-4.4-3.6-8-8-8H67z"/>
    </g>
    <g>
      <path class="st0" d="M253.1,107.8l-17.1-16l-17.1,16l-7.3-8l24.5-22.6l24.5,22.6L253.1,107.8z"/>
    </g>
    <g>
      <path class="st0" d="M217.9,213.4l17.1,16l17.1-16l7.3,8l-24.5,22.6l-24.5-22.6L217.9,213.4z"/>
    </g>
    <g>
      <path class="st0" d="M353.8,243.6l16-17.1l-16-17.1l8-7.3l22.6,24.5l-22.6,24.5L353.8,243.6z"/>
    </g>
    <g>
      <path class="st0" d="M117.2,208.4l-16,17.1l16,17.1l-8,7.3l-22.6-24.5l22.6-24.5L117.2,208.4z"/>
    </g>
  </g>
</g>
<g id="Layer_2">
</g>
</svg>
    `}`;
  }
}

/** A loading indicator. */
@customElement('loading-icon')
export class LoadingIcon extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .loader {
      stroke: #ffffff;
      stroke-width: 3;
      stroke-linecap: round;
      animation: spin linear 1s infinite;
      transform-origin: center;
      transform-box: fill-box;
    }
    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(359deg);
      }
    }
  ` as CSSResultGroup;

  override render() {
    return html` <svg
      width="140"
      height="140"
      viewBox="0 -10 140 150"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      ${renderLoading()}
    </svg>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'play-pause-button': PlayPauseButton;
    'reset-button': ResetButton;
    'settings-button': SettingsButton;
    'collapse-button': CollapseButton;
    'autopilot-button': AutopilotButton;
    'info-button': InfoButton;
    'vocals-button': VocalsButton;
    'close-button': CloseButton;
    'arrows-icon': ArrowsIcon;
    'wasd-icon': WasdIcon;
    'loading-icon': LoadingIcon;
  }
}
