import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

// storage directory for fragments
const STORAGE_DIR = path.join(process.cwd(), "storage");
const FRAGMENTS_DIR = path.join(STORAGE_DIR, "fragments");

function generateGUID() {
  // Prefer built-in randomUUID when available
  if (typeof (crypto as any).randomUUID === "function") {
    return (crypto as any).randomUUID();
  }

  // Fallback: generate RFC 4122 version 4 UUID from cryptographically secure random bytes
  const bytes = crypto.randomBytes(16);

  // Per RFC 4122, set the four most significant bits of the 7th byte to 0100 (version 4)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;

  // Set the two most significant bits of the 9th byte to 10 (variant 1)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString("hex");

  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32)
  ].join("-");
}

async function initStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.mkdir(FRAGMENTS_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating storage directories:", error);
  }
}

async function saveFragmentToFile(filename: string, data: Uint8Array) {
  try {
    const fragmentPath = path.join(FRAGMENTS_DIR, `${filename}.frag`);

    // Save fragment data
    await fs.writeFile(fragmentPath, data);
    
    return fragmentPath;
  } catch (error) {
    throw error;
  }
}

async function loadFragmentFromFile(filename: string) {
  try {
    const fragmentPath = path.join(FRAGMENTS_DIR, `${filename}.frag`);
    
    const data = await fs.readFile(fragmentPath);
    
    const fragments = new Uint8Array(data);
    return fragments;
  } catch (error) {
    console.error("Error loading fragment:", error);
    throw error;
  }
}

export {
  initStorage,
  saveFragmentToFile,
  loadFragmentFromFile,
  generateGUID
};
