const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const SystemSettings = require('../models/SystemSettings');

// Default similarity threshold (cosine similarity, 0–1, higher = more similar)
const DEFAULT_SIMILARITY_THRESHOLD = 0.6;

let configCache = {
  similarityThreshold: DEFAULT_SIMILARITY_THRESHOLD,
  lastLoadedAt: 0,
};

const CONFIG_CACHE_TTL_MS = 60 * 1000; // 1 minute

async function loadConfig() {
  const now = Date.now();
  if (now - configCache.lastLoadedAt < CONFIG_CACHE_TTL_MS) {
    return configCache;
  }

  try {
    const doc = await SystemSettings.findOne({ key: 'similarityThreshold' });
    const value = doc && typeof doc.value === 'number' ? doc.value : DEFAULT_SIMILARITY_THRESHOLD;
    configCache = {
      similarityThreshold: value,
      lastLoadedAt: now,
    };
  } catch (err) {
    configCache = {
      similarityThreshold: DEFAULT_SIMILARITY_THRESHOLD,
      lastLoadedAt: now,
    };
  }

  return configCache;
}

async function getSimilarityThreshold() {
  const cfg = await loadConfig();
  return cfg.similarityThreshold || DEFAULT_SIMILARITY_THRESHOLD;
}

/**
 * Placeholder for loading a deep learning model.
 * The current implementation uses a lightweight image embedding based on
 * resized grayscale pixels. This keeps the system working without large
 * model downloads and can be swapped with InsightFace/TF.js later.
 */
async function loadModel() {
  // No-op for now – sharp is lazy-loaded on first use.
  return true;
}

/**
 * Generate a simple numeric embedding from an image file.
 * - Resizes to 64x64
 * - Converts to grayscale
 * - Returns a Float32Array normalized to unit length
 *
 * @param {string} imagePath
 * @returns {Promise<Float32Array>}
 */
async function generateEmbedding(imagePath) {
  if (!imagePath) {
    throw new Error('imagePath is required');
  }

  const absolutePath = path.resolve(imagePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Image not found at path: ${absolutePath}`);
  }

  await loadModel();

  const { data } = await sharp(absolutePath)
    .resize(64, 64, { fit: 'cover' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // data is a Uint8Array of length 4096 (64x64)
  const length = data.length;
  const embedding = new Float32Array(length);

  let normSq = 0;
  for (let i = 0; i < length; i += 1) {
    const v = data[i] / 255; // normalize pixel 0–1
    embedding[i] = v;
    normSq += v * v;
  }

  const norm = Math.sqrt(normSq) || 1;
  for (let i = 0; i < length; i += 1) {
    embedding[i] /= norm;
  }

  return embedding;
}

/**
 * Cosine similarity between two Float32Array embeddings.
 * Returns number in [-1, 1]; for non-negative embeddings this is [0, 1].
 */
function cosineSimilarity(emb1, emb2) {
  if (!emb1 || !emb2 || emb1.length !== emb2.length) {
    return -1;
  }

  let dot = 0;
  let norm1Sq = 0;
  let norm2Sq = 0;

  for (let i = 0; i < emb1.length; i += 1) {
    const v1 = emb1[i];
    const v2 = emb2[i];
    dot += v1 * v2;
    norm1Sq += v1 * v1;
    norm2Sq += v2 * v2;
  }

  const denom = Math.sqrt(norm1Sq) * Math.sqrt(norm2Sq) || 1;
  return dot / denom;
}

async function compareEmbeddings(emb1, emb2) {
  return cosineSimilarity(emb1, emb2);
}

module.exports = {
  loadModel,
  generateEmbedding,
  compareEmbeddings,
  getSimilarityThreshold,
};

