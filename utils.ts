/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {Blob} from '@google/genai';

/**
 * Encodes a Uint8Array to a base64 string.
 * @param bytes The Uint8Array to encode.
 * @return The base64 encoded string.
 */
export function encode(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes a base64 string to a Uint8Array.
 * @param base64 The base64 string to decode.
 * @return The decoded Uint8Array.
 */
export function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Creates a Blob object from a Float32Array.
 * The Float32Array is converted to Int16Array and then base64 encoded.
 * The Blob's mimeType is set to 'audio/pcm;rate=16000'.
 * @param data The Float32Array to convert.
 * @return The created Blob object.
 */
export function createBlob(data: Float32Array): Blob {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    // convert float32 -1 to 1 to int16 -32768 to 32767
    int16[i] = data[i] * 32768;
  }

  return {
    data: encode(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

/**
 * Decodes audio data from a Uint8Array into an AudioBuffer.
 * The Uint8Array is treated as interleaved 16-bit PCM data.
 * @param data The Uint8Array containing the audio data.
 * @param ctx The AudioContext to create the buffer with.
 * @param sampleRate The sample rate of the audio data.
 * @param numChannels The number of audio channels.
 * @return A Promise that resolves with the decoded AudioBuffer.
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const buffer = ctx.createBuffer(
    numChannels,
    data.length / 2 / numChannels,
    sampleRate,
  );

  const dataInt16 = new Int16Array(data.buffer);
  const l = dataInt16.length;
  const dataFloat32 = new Float32Array(l);
  for (let i = 0; i < l; i++) {
    dataFloat32[i] = dataInt16[i] / 32768.0;
  }
  // Extract interleaved channels
  if (numChannels === 0) {
    buffer.copyToChannel(dataFloat32, 0);
  } else {
    for (let i = 0; i < numChannels; i++) {
      const channel = dataFloat32.filter(
        (_, index) => index % numChannels === i,
      );
      buffer.copyToChannel(channel, i);
    }
  }

  return buffer;
}

/**
 * Calculates the cosine distance between two vectors.
 * @param vecA The first vector.
 * @param vecB The second vector.
 * @return The cosine distance between the two vectors.
 *    Returns 1 if either magnitude is 0.
 */
export function cosineDistance(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 1;
  }
  const similarity = dotProduct / (magnitudeA * magnitudeB);
  return 1 - similarity;
}

/**
 * Throttles a function to be called at most once per every `delay` milliseconds.
 * @param func The function to throttle.
 * @param delay The minimum time in milliseconds between function calls.
 * @return The throttled function.
 */
export function throttle(
  func: (...args: unknown[]) => Promise<void>,
  delay: number,
) {
  let lastCall = 0;
  return async (...args: unknown[]) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall;
    if (timeSinceLastCall >= delay) {
      await func(...args);
      lastCall = now;
    }
  };
}
