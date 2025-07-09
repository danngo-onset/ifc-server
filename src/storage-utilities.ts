import fs from "fs/promises";
import path from "path";

// storage directory for fragments
const STORAGE_DIR = path.join(__dirname, "../storage");
const FRAGMENTS_DIR = path.join(STORAGE_DIR, "fragments");

async function initStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.mkdir(FRAGMENTS_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating storage directories:", error);
  }
}

async function saveFragmentToFile(
  filename: string, 
  data: Uint8Array, 
  metadata: any
) {
  try {
    const fragmentPath = path.join(FRAGMENTS_DIR, `${filename}.frag`);
    const metadataPath = path.join(FRAGMENTS_DIR, `${filename}.json`);
    
    await fs.writeFile(fragmentPath, data);
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    
    console.log(`Fragment saved: ${filename}`);
    return { fragmentPath, metadataPath };
  } catch (error) {
    console.error("Error saving fragment:", error);
    throw error;
  }
}

async function loadFragmentFromFile(filename: string) {
  try {
    const fragmentPath = path.join(FRAGMENTS_DIR, `${filename}.frag`);
    const metadataPath = path.join(FRAGMENTS_DIR, `${filename}.json`);
    
    const data = await fs.readFile(fragmentPath);
    const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
    
    return { 
      data: new Uint8Array(data), 
      metadata 
    };
  } catch (error) {
    console.error("Error loading fragment:", error);
    throw error;
  }
}

async function listStoredFragments() {
  try {
    const files = await fs.readdir(FRAGMENTS_DIR);
    const fragments = files
      .filter(file => file.endsWith(".json"))
      .map(file => file.replace(".json", ""));
    
    const fragmentsWithMetadata = await Promise.all(
      fragments.map(async (filename) => {
        try {
          const metadataPath = path.join(FRAGMENTS_DIR, `${filename}.json`);
          const metadata = JSON.parse(await fs.readFile(metadataPath, "utf-8"));
          
          return { filename, ...metadata };
        } catch {
          return { filename, error: "Could not read metadata" };
        }
      })
    );
    
    return fragmentsWithMetadata;
  } catch (error) {
    console.error("Error listing fragments:", error);
    return [];
  }
}

export {
  initStorage,
  saveFragmentToFile,
  loadFragmentFromFile,
  listStoredFragments
};
