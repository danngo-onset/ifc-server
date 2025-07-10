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

async function saveFragmentToFile(
  filename    : string, 
  data        : Uint8Array,
  properties? : string
) {
  try {
    const fragmentPath = path.join(FRAGMENTS_DIR, `${filename}.frag`);
    const metadataPath = path.join(FRAGMENTS_DIR, `${filename}.meta.json`);
    
    // Save fragment data
    await fs.writeFile(fragmentPath, data);
    
    // Save properties metadata if provided
    if (properties) {
      const metadata = {
        properties: properties,
        timestamp: new Date().toISOString()
      };

      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    }
    
    return fragmentPath;
  } catch (error) {
    throw error;
  }
}

async function loadFragmentFromFile(filename: string) {
  try {
    const fragmentPath = path.join(FRAGMENTS_DIR, `${filename}.frag`);
    const metadataPath = path.join(FRAGMENTS_DIR, `${filename}.meta.json`);
    
    const data = await fs.readFile(fragmentPath);
    
    let properties = null;
    try {
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      const metadata = JSON.parse(metadataContent);

      properties = metadata.properties;
    } catch (metaError) {
      console.log("No metadata file found for fragment:", filename);
    }
    
    return {
      fragments  : new Uint8Array(data),
      properties : properties
    };
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
