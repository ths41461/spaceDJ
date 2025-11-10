/**
 * @fileoverview Control real time music with text prompts
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {html, LitElement, render} from 'lit';
import {customElement, property, query, state} from 'lit/decorators.js';
import {classMap} from 'lit/directives/class-map.js';
import {when} from 'lit/directives/when.js';

import './icon_button';
import './space';
import './space_settings';
import './toast';
import './tooltip';

import {
  GoogleGenAI,
  MusicGenerationMode,
  type LiveMusicServerMessage,
  type LiveMusicSession,
} from '@google/genai';
import {EMBEDDINGS} from './embeddings';
import {MD_STYLES, SPACE_DJ_STYLES} from './styles';
import {ToastMessage} from './toast';
import {decode, decodeAudioData, throttle} from './utils';

const LYRIA_RT_MODEL = 'lyria-realtime-exp';
const NAVIGATION_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

interface Prompt {
  text: string;
  weight: number;
}

type PlaybackState = 'stopped' | 'playing' | 'loading' | 'paused';

/** Component for the SpaceDJ UI. */
@customElement('space-dj')
class SpaceDJ extends LitElement {
  static override styles = [MD_STYLES, SPACE_DJ_STYLES];

  @property({type: Object}) embeddingsCache!: Map<string, number[]>;
  @property({
    type: Object,
    attribute: false,
  })
  private prompts = new Map<string, Prompt>();
  private session: LiveMusicSession;
  private readonly sampleRate = 48000;
  private readonly audioContext = new (window.AudioContext ||
    window.webkitAudioContext)({sampleRate: this.sampleRate});
  private outputNode: GainNode = this.audioContext.createGain();
  private nextStartTime = 0;
  private readonly bufferTime = 2; // adds an audio buffer in case of netowrk latency
  @state() private playbackState: PlaybackState = 'stopped';
  @state({type: Object})
  private filteredPrompts = new Set<string>();
  private connectionError = true;
  private isConnecting = false;
  private isTouchDevice = false;
  @state() private areVocalsEnabled = false;

  @state()
  private spaceSettings = {
    pointCount: 300,
    neighborRadius: 0.25,
    includeHighDimensionalNeighbors: true,
    threeDClickRadius: 1.0,
    randomizePoints: false,
    randomizeEmbeddings: false,
    nNeighbors: 10,
    minDist: 0.1,
    spread: 0.75,
  };

  @state()
  private showSettings = false;
  @state()
  private infoOverlayCollapsed = true;
  @state()
  private promptsOverlayCollapsed = false;
  @query('toast-message') private toastMessage!: ToastMessage;
  @state()
  private controlsOverlayDismissed = false;
  @state()
  private showControlsOverlay = false;
  @state()
  private isCloudRunDeployment = false;

  constructor() {
    super();
    this.outputNode.connect(this.audioContext.destination);
  }

  protected override async firstUpdated() {
    const urlParams = new URLSearchParams(window.location.search);
    const forceControlsParam = urlParams.get('force-controls');
    const forceControls = forceControlsParam === 'true';
    this.controlsOverlayDismissed =
      !forceControls &&
      localStorage.getItem('controlsOverlayDismissed') === 'true';
    this.showControlsOverlay = !this.controlsOverlayDismissed;
    this.isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (this.isTouchDevice) {
      this.toastMessage.show(
        'For the best experience, please access the app from a desktop computer.',
      );
    }
    this.isCloudRunDeployment = window.location.host.includes('run.app');

    await this.connectToSession();
    await this.toggleVocals();
  }

  private async connectToSession() {
    if (this.isConnecting) {
      return;
    }
    this.isConnecting = true;
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      apiVersion: 'v1alpha',
    });
    let resolveConnectedPromise: () => void;
    const connectedPromise = new Promise<void>((resolve) => {
      resolveConnectedPromise = resolve;
    }).then(() => {
      this.isConnecting = false;
    });
    const handleError = () => {
      this.connectionError = true;
      this.stopAudio();
      this.toastMessage.show('Connection error, please restart audio.');
      resolveConnectedPromise();
    };
    this.session = await ai.live.music.connect({
      model: LYRIA_RT_MODEL,
      callbacks: {
        onmessage: async (e: LiveMusicServerMessage) => {
          if (e.setupComplete) {
            console.log('connected');
            resolveConnectedPromise();
            this.connectionError = false;
            if (!this.isTouchDevice) {
              this.toastMessage.hide();
            }
          }
          if (e.filteredPrompt) {
            this.filteredPrompts = new Set([
              ...this.filteredPrompts,
              e.filteredPrompt.text,
            ]);
            this.toastMessage.show(e.filteredPrompt.filteredReason);
          }
          if (e.serverContent?.audioChunks !== undefined) {
            if (
              this.playbackState === 'paused' ||
              this.playbackState === 'stopped'
            ) {
              return;
            }
            const audioBuffer = await decodeAudioData(
              decode(e.serverContent?.audioChunks[0].data),
              this.audioContext,
              48000,
              2,
            );
            const source = this.audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(this.outputNode);
            if (this.nextStartTime === 0) {
              this.nextStartTime =
                this.audioContext.currentTime + this.bufferTime;
              this.outputNode.gain.setValueAtTime(0, this.nextStartTime);
              this.outputNode.gain.linearRampToValueAtTime(
                1,
                this.nextStartTime + 0.75,
              );
              setTimeout(() => {
                this.playbackState = 'playing';
              }, this.bufferTime * 1000);
            }

            if (this.nextStartTime < this.audioContext.currentTime) {
              console.log('under run');
              this.playbackState = 'loading';
              this.nextStartTime = 0;
              return;
            }
            source.start(this.nextStartTime);
            this.nextStartTime += audioBuffer.duration;
          }
        },
        onerror: (e: ErrorEvent) => {
          console.warn('Error occurred: ', e);
          handleError();
        },
        onclose: (e: CloseEvent) => {
          console.warn('Connection closed.', e);
          handleError();
        },
      },
    });
    return connectedPromise;
  }

  private async handlePlayPause() {
    if (this.isConnecting) {
      this.toastMessage.show('Please wait for API to be ready.');
      return;
    }
    if (this.playbackState === 'playing') {
      this.pauseAudio();
    } else if (
      this.playbackState === 'paused' ||
      this.playbackState === 'stopped'
    ) {
      if (this.connectionError) {
        await this.connectToSession();
        await this.setSessionPrompts();
      }
      this.loadAudio();
    } else if (this.playbackState === 'loading') {
      this.stopAudio();
    }
  }

  private pauseAudio() {
    this.session.pause();
    this.playbackState = 'paused';
    this.outputNode.gain.setValueAtTime(1, this.audioContext.currentTime);
    this.outputNode.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + 0.1,
    );
    this.nextStartTime = 0;
    this.outputNode = this.audioContext.createGain();
    this.outputNode.connect(this.audioContext.destination);
  }

  private loadAudio() {
    console.log('loading');
    this.audioContext.resume();
    this.session.play();
    this.playbackState = 'loading';
    this.outputNode.gain.setValueAtTime(0, this.audioContext.currentTime);
  }

  private stopAudio() {
    console.log('stopped');
    this.session.stop();
    this.playbackState = 'stopped';
    this.outputNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    this.outputNode.gain.linearRampToValueAtTime(
      1,
      this.audioContext.currentTime + 0.1,
    );
    this.nextStartTime = 0;
  }

  private async handleReset() {
    if (this.isConnecting) {
      this.toastMessage.show('Please wait for API to be ready.');
      return;
    }
    console.log('reset');
    if (this.connectionError) {
      await this.connectToSession();
      await this.setSessionPrompts();
    } else {
      this.pauseAudio();
      this.session.resetContext();
    }
    this.loadAudio();
  }

  private readonly setSessionPrompts = throttle(async () => {
    const promptsToSend = Array.from(this.prompts.values()).filter((p) => {
      return !this.filteredPrompts.has(p.text) && p.weight !== 0;
    });
    try {
      await this.session.setWeightedPrompts({
        weightedPrompts: promptsToSend,
      });
    } catch (e) {
      this.toastMessage.show(e.message);
      this.pauseAudio();
    }
  }, 200);

  override connectedCallback() {
    super.connectedCallback();
    window.addEventListener('keydown', this.handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private handleKeyDown = (event: KeyboardEvent) => {
    // Do not trigger if the user is focused on an input element.
    const target = event.target as HTMLElement;
    if (
      target.nodeName === 'INPUT' ||
      target.nodeName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      void this.handlePlayPause();
    }
    // Auto-dismiss controls on first load.
    if (this.controlsOverlayDismissed) {
      return;
    }
    if (NAVIGATION_KEYS.has(event.code)) {
      this.dismissControlsOverlay();
    }
  };

  private togglePromptsOverlay() {
    this.promptsOverlayCollapsed = !this.promptsOverlayCollapsed;
  }

  private showControlsOverlayHandler() {
    this.showControlsOverlay = true;
  }

  private toggleInfoOverlay() {
    this.infoOverlayCollapsed = !this.infoOverlayCollapsed;
  }

  private dismissControlsOverlay() {
    if (!this.controlsOverlayDismissed) {
      setTimeout(() => {
        this.controlsOverlayDismissed = true;
      }, 5000);
    }
    this.showControlsOverlay = false;
    this.infoOverlayCollapsed = true;
    localStorage.setItem('controlsOverlayDismissed', 'true');
  }

  private toggleSettings() {
    this.showSettings = !this.showSettings;
  }

  private async handlePromptsSelected(
    event: CustomEvent<{promptWeights: {[key: string]: number}}>,
  ) {
    const promptWeights = event.detail.promptWeights;
    const newPrompts = new Map<string, Prompt>();
    for (const text in promptWeights) {
      if (Object.prototype.hasOwnProperty.call(promptWeights, text)) {
        const weight = promptWeights[text];
        if (weight < 0.01) {
          continue;
        }
        const newPrompt: Prompt = {
          text,
          weight,
        };
        newPrompts.set(text, newPrompt);
      }
    }
    if (newPrompts.size === 0) {
      return;
    }
    this.prompts = newPrompts;
    await this.setSessionPrompts();
    if (this.playbackState === 'stopped') {
      await this.handlePlayPause();
    }
  }

  private handleSettingsChange(
    e: CustomEvent<{property: string; value: unknown}>,
  ) {
    const {property, value} = e.detail;
    this.spaceSettings = {
      ...this.spaceSettings,
      [property]: value,
    };
  }

  private renderPromptList() {
    if (this.prompts.size === 0) {
      return html``;
    }
    const prompts = Array.from(this.prompts.values());
    prompts.sort((a, b) => b.weight - a.weight);

    return html`
      <div
        class="prompt-overlay ${this.promptsOverlayCollapsed
          ? 'collapsed'
          : ''}">
        <div class="prompt-overlay-header">
          <h2>PROMPTS</h2>
          <div
            class=${classMap({
              'loading-icon-container': true,
              'hidden': this.playbackState !== 'loading',
            })}>
            ${when(
              this.playbackState === 'loading',
              () => html`<loading-icon></loading-icon>`,
            )}
          </div>
          <collapse-button
            .collapsed=${this.promptsOverlayCollapsed}
            @click=${this.togglePromptsOverlay}></collapse-button>
        </div>
        ${when(
          !this.promptsOverlayCollapsed,
          () => html`
            ${prompts.map(
              (prompt) => html`
                <div class="prompt-item">
                  <span class="prompt-text" title=${prompt.text ?? ''}
                    >${prompt.text}</span
                  >
                  <span class="prompt-weight">${prompt.weight.toFixed(2)}</span>
                </div>
              `,
            )}
          `,
        )}
      </div>
    `;
  }

  private renderShowControlsButton() {
    const isHidden = this.showControlsOverlay || !this.controlsOverlayDismissed;
    return when(
      !isHidden,
      () => html`
        <div class="show-controls-button">
          <md-outlined-button @click=${this.showControlsOverlayHandler}>
            SHOW CONTROLS
          </md-outlined-button>
          ${when(
            this.isCloudRunDeployment,
            () => html`
              <md-outlined-button
                href="https://aistudio.google.com/apps/bundled/spacedj"
                target="_blank"
                >REMIX IN AI STUDIO
              </md-outlined-button>
            `,
          )}
        </div>
      `,
    );
  }

  private renderInfoOverlay() {
    return html`
      <div class="info-overlay ${this.infoOverlayCollapsed ? 'collapsed' : ''}">
        <div class="info-overlay-header">
          <info-button
            class="${!this.infoOverlayCollapsed ? 'uncollapsed' : ''}"
            .collapsed=${this.infoOverlayCollapsed}
            @click=${this.toggleInfoOverlay}></info-button>
        </div>
        ${when(
          !this.infoOverlayCollapsed,
          () => html`
            <div class="info-item">
              <span class="info-item-title">About</span>
              <span>
                Space DJ is an interactive exploration of the latent space of
                <a
                  href="https://deepmind.google/models/lyria/realtime/"
                  target="_blank"
                  >Lyria Realtime</a
                >. It embeds musical genres through the open-source
                <a
                  href="https://magenta.withgoogle.com/magenta-realtime"
                  target="_blank"
                  >Magenta RT</a
                >
                model, and visualizes them in 3D with
                <a
                  href="https://pair-code.github.io/understanding-umap/"
                  target="_blank"
                  >UMAP</a
                >
                in order to generate music with
                <a
                  href="https://ai.google.dev/gemini-api/docs/music-generation"
                  target="_blank"
                  >Gemini Live Music</a
                >.
              </span>
            </div>
            <div class="info-item">
              <span class="info-item-title">Navigation</span>
              <span>
                Use <code>WASD</code> and
                <code>&larr;&uarr;&darr;&rarr;</code> keys to fly through space.
                The music will transition based on the selected prompts. Click
                to anchor prompts and their neighbors.
              </span>
            </div>
            <div class="info-item">
              <span class="info-item-title">Autopilot</span>
              <span
                >Automatically navigates the latent space for a continuous
                mix.</span
              >
            </div>
            <div class="info-item">
              <span class="info-item-title">Settings</span>
              <span
                >Adjust UMAP visualization parameters and re-render the
                space.</span
              >
            </div>
            <div class="info-item">
              <span class="info-item-title">Vocals</span>
              <span>Enable or disable vocals in the music generation.</span>
            </div>
            <div class="info-item">
              <span class="info-item-title">Play/Pause</span>
              <span
                >Start or stop music generation. You can also use the
                <code>Spacebar</code>.</span
              >
            </div>
            <div class="info-item">
              <span class="info-item-title">Reset</span>
              <span>Restart the audio stream with the current prompts.</span>
            </div>
          `,
        )}
      </div>
    `;
  }

  private renderControlsOverlay() {
    return html`
      <div
        class=${classMap({
          'controls-overlay': true,
          hidden: !this.showControlsOverlay,
          'first-dismissal': !this.controlsOverlayDismissed,
        })}>
        <div
          class="control-overlay-items-container ${this.infoOverlayCollapsed
            ? ''
            : 'hidden'}">
          <div class="control-item">
            <close-button
              class="close-controls-button"
              @click=${this.dismissControlsOverlay}>
            </close-button>
            <div class="control-svg">
              <wasd-icon></wasd-icon>
            </div>
            <span>MOVE</span>
          </div>
          <div class="control-item">
            <close-button
              class="close-controls-button space-only"
              @click=${this.dismissControlsOverlay}>
            </close-button>
            <div class="control-svg">
              <arrows-icon></arrows-icon>
            </div>
            <span>ROTATE</span>
          </div>
        </div>
        <div class="control-overlay-header">${this.renderInfoOverlay()}</div>
      </div>
    `;
  }

  private handleAutopilotDisengaged() {
    const autopilotButton = this.shadowRoot?.querySelector('autopilot-button');
    if (autopilotButton && autopilotButton.active) {
      autopilotButton.active = false;
    }
  }

  private renderSpace() {
    const spaceComponent = this.shadowRoot?.querySelector('space-component');
    if (!spaceComponent) {
      return;
    }
    spaceComponent.renderSpace();
  }

  private toggleAutopilot() {
    const spaceComponent = this.shadowRoot?.querySelector('space-component');
    if (!spaceComponent) {
      return;
    }
    const autopilotEnabled = spaceComponent.toggleAutopilot();
    const autopilotButton = this.shadowRoot?.querySelector('autopilot-button');
    if (!autopilotButton) {
      return;
    }
    autopilotButton.active = autopilotEnabled;
  }

  private async toggleVocals() {
    this.areVocalsEnabled = !this.areVocalsEnabled;
    await this.session.setMusicGenerationConfig({
      musicGenerationConfig: {
        musicGenerationMode: this.areVocalsEnabled
          ? MusicGenerationMode.VOCALIZATION
          : MusicGenerationMode.QUALITY,
      },
    });
  }

  private renderSettings() {
    return when(
      this.showSettings,
      () =>
        html`<div class="container">
          <space-settings
            .settings=${this.spaceSettings}
            @settings-changed=${this.handleSettingsChange}
            @render-space-clicked=${this.renderSpace}></space-settings>
        </div>`,
    );
  }

  private renderHeader() {
    return html`
      <div class="header">
        <div class="header-row">
          <h1>Space DJ</h1>
          <div class="controls">
            <tooltip-message message="Autopilot" position="bottom">
              <autopilot-button
                @click=${this.toggleAutopilot}></autopilot-button>
            </tooltip-message>
            <tooltip-message message="Settings" position="bottom">
              <settings-button @click=${this.toggleSettings}></settings-button>
            </tooltip-message>
            <tooltip-message
              message="${this.areVocalsEnabled
                ? 'Disable vocals'
                : 'Enable vocals'}"
              position="bottom">
              <vocals-button
                .enabled=${this.areVocalsEnabled}
                @click=${this.toggleVocals}></vocals-button>
            </tooltip-message>
            <tooltip-message
              message="${this.playbackState === 'playing' ||
              this.playbackState === 'loading'
                ? 'Pause'
                : 'Play'}"
              position="bottom">
              <play-pause-button
                .playbackState=${this.playbackState}
                @click=${this.handlePlayPause}></play-pause-button>
            </tooltip-message>
            <tooltip-message message="Reset" position="bottom">
              <reset-button @click=${this.handleReset}></reset-button>
            </tooltip-message>
          </div>
        </div>
        ${this.renderSettings()}
      </div>
    `;
  }

  override render() {
    return html`
      ${this.renderHeader()}
      <space-component
        .embeddingsCache=${this.embeddingsCache}
        @prompts-selected=${this.handlePromptsSelected}
        @autopilot-disengaged=${this.handleAutopilotDisengaged}
        .pointCount=${this.spaceSettings.pointCount}
        .neighborRadius=${this.spaceSettings.neighborRadius}
        .includeHighDimensionalNeighbors=${this.spaceSettings
          .includeHighDimensionalNeighbors}
        .threeDClickRadius=${this.spaceSettings.threeDClickRadius}
        .randomizePoints=${this.spaceSettings.randomizePoints}
        .randomizeEmbeddings=${this.spaceSettings.randomizeEmbeddings}
        .nNeighbors=${this.spaceSettings.nNeighbors}
        .minDist=${this.spaceSettings.minDist}
        .spread=${this.spaceSettings.spread}></space-component>
      ${this.renderPromptList()} ${this.renderControlsOverlay()}
      ${this.renderShowControlsButton()}
      <toast-message></toast-message>
    `;
  }
}

function main(container: HTMLElement) {
  const embeddingsCache = new Map<string, number[]>(Object.entries(EMBEDDINGS));
  render(
    html`<space-dj .embeddingsCache=${embeddingsCache}></space-dj>`,
    container,
  );
}

main(document.body);

declare global {
  interface HTMLElementTagNameMap {
    'space-dj': SpaceDJ;
  }
}
