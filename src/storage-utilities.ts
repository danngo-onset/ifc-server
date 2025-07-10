import fs from "fs/promises";
import path from "path";

// storage directory for fragments
const STORAGE_DIR = path.join(process.cwd(), "storage");
const FRAGMENTS_DIR = path.join(STORAGE_DIR, "fragments");

const lut: string[] = [];

for (let i = 0; i < 256; i++) {
	lut[i] = (i < 16 ? "0" : "") + i.toString(16);
}

function generateUUID() {
  const d0 = Math.random() * 0xffffffff | 0;
  const d1 = Math.random() * 0xffffffff | 0;
  const d2 = Math.random() * 0xffffffff | 0;
  const d3 = Math.random() * 0xffffffff | 0;
  const uuid = lut[ d0 & 0xff ] + lut[ d0 >> 8 & 0xff ] + lut[ d0 >> 16 & 0xff ] + lut[ d0 >> 24 & 0xff ] + '-' +
               lut[ d1 & 0xff ] + lut[ d1 >> 8 & 0xff ] + '-' + lut[ d1 >> 16 & 0x0f | 0x40 ] + lut[ d1 >> 24 & 0xff ] + '-' +
               lut[ d2 & 0x3f | 0x80 ] + lut[ d2 >> 8 & 0xff ] + '-' + lut[ d2 >> 16 & 0xff ] + lut[ d2 >> 24 & 0xff ] +
               lut[ d3 & 0xff ] + lut[ d3 >> 8 & 0xff ] + lut[ d3 >> 16 & 0xff ] + lut[ d3 >> 24 & 0xff ];

  // .toLowerCase() here flattens concatenated strings to save heap memory space.
  return uuid.toLowerCase();
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
  generateUUID
};
