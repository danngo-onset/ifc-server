import fs from "fs/promises";
import path from "path";

// storage directory for fragments
const STORAGE_DIR = path.join(process.cwd(), "storage");
const FRAGMENTS_DIR = path.join(STORAGE_DIR, "fragments");

async function initStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.mkdir(FRAGMENTS_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating storage directories:", error);
  }
}

async function saveFragmentToFile(filename: string, data: Uint8Array) {
  const fragmentPath = path.join(FRAGMENTS_DIR, `${filename}.frag`);

  // Save fragment data
  await fs.writeFile(fragmentPath, data);
  
  return fragmentPath;
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
  loadFragmentFromFile
};
