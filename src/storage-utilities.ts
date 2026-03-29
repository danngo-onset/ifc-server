import fs from "fs/promises";
import path from "path";

// storage directory for fragments
const STORAGE_DIR = path.join(process.cwd(), "storage");
const FRAGMENTS_DIR = path.join(STORAGE_DIR, "fragments");

function generateGUID() {
  let i;
  let result = "";

  for (let j = 0; j < 32; j++) {
    if (j === 8 || j === 12 || j === 16 || j === 20) 
      result += "-";

    i = Math.floor(Math.random() * 16)
            .toString(16)
            .toLowerCase();

    result += i;
  }

  return result;
}

async function initStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.mkdir(FRAGMENTS_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating storage directories:", error);
  }
}

function isValidFragmentId(id: string): boolean {
  // Only allow lowercase hex characters and hyphens, matching generateGUID output.
  // This also prevents path separators and traversal sequences from being used.
  return /^[0-9a-f-]+$/.test(id);
}

async function saveFragmentToFile(filename: string, data: Uint8Array) {
  try {
    if (!isValidFragmentId(filename)) {
      throw new Error("Invalid fragment identifier");
    }

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
    if (!isValidFragmentId(filename)) {
      throw new Error("Invalid fragment identifier");
    }

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
