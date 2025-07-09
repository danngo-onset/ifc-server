import fs from "fs/promises";
import path from "path";

import express, { Request, Response } from "express";

import cors from "cors";

import multer from "multer";

import * as WEBIFC from "web-ifc";
import * as OBC from "@thatopen/components";

import * as StorageUtilities from "./storage-utilities";

const app = express();
const port = process.env.PORT || 8000;

StorageUtilities.initStorage();

app
  .use(cors({
    origin: "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  }))
  .use(express.json());


// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

const components = new OBC.Components();

const fragmentsManager = components.get(OBC.FragmentsManager);
fragmentsManager.onFragmentsLoaded.add((model) => {
  console.log(model);
});

const ifcLoader = components.get(OBC.IfcLoader);

async function setupIfcLoader() {
  try {
    ifcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
    
    // Optionally exclude some categories
    const excludedCats = [
      WEBIFC.IFCTENDONANCHOR,
      WEBIFC.IFCREINFORCINGBAR,
      WEBIFC.IFCREINFORCINGELEMENT,
    ];
    for (const cat of excludedCats) {
      ifcLoader.settings.excludedCategories.add(cat);
    }
    
    await ifcLoader.setup();

    // Set WASM path
    const wasmPath = path.join(process.cwd(), "node_modules/web-ifc/");
    ifcLoader.settings.wasm = {
      path: wasmPath.endsWith("/") ? wasmPath : wasmPath + "/",
      absolute: true,
    };
  } catch (error) {
    console.error("Error setting up IFC loader:", error);
    throw error;
  }
}

setupIfcLoader();

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Hello World");
});

app.get("/fragments", async (req: Request, res: Response) => {
  try {
    const storedFragments = await StorageUtilities.listStoredFragments();
    const groupsCount = fragmentsManager.groups.size;
    const groups = Array.from(fragmentsManager.groups.values());
    
    const loadedGroupsInfo = groups.map(group => ({
      fragmentsCount: group.items ? Object.keys(group.items).length : 0,
      boundingBox: group.boundingBox
    }));
    
    res.status(200).json({
      currentlyLoaded: {
        groupsCount,
        groups: loadedGroupsInfo
      },
      storedFragments
    });
  } catch (error) {
    console.error("Error getting fragments:", error);
    res.status(500).json({ error: "Error retrieving fragments" });
  }
});

app.post("/fragments", upload.single("file"), async (req: Request, res: Response) => {
	const file = req.file;

	if (!file) return res.status(400).send("No file provided");

	try {
    console.log(`Received file: ${file.originalname}, size: ${file.size} bytes`);
    
    // Load the IFC file using IfcLoader
    const buffer = new Uint8Array(file.buffer);
    console.log(`Loading IFC file with buffer length: ${buffer.length}`);
    
    try {
      // Load IFC and get the FragmentsGroup model
      await ifcLoader.load(buffer);
      console.log(`✅ IFC loaded successfully. Fragment groups: ${fragmentsManager.groups.size}`);
    } catch (obcError) {
      console.log("OBC.IfcLoader failed:", (obcError as Error).message);
      throw obcError;
    }
      
    const fragments = await exportFragments();

    // Save fragments to disk with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = file.originalname.replace(/\.[^/.]+$/, ""); // Remove extension
    const storedFilename = `${baseFilename}_${timestamp}`;
    
    const metadata = {
      originalFilename: file.originalname,
      uploadedAt: new Date().toISOString(),
      fileSize: file.size,
      ...fragments
    };

    if (fragments && fragments.data) {
      // Convert base64 back to Uint8Array for storage
      const fragmentsBuffer = Buffer.from(fragments.data, "base64");

      await StorageUtilities.saveFragmentToFile(
        storedFilename, 
        new Uint8Array(fragmentsBuffer), 
        metadata
      );

      return res.status(200).json({ 
        success: true,
        message: "IFC processed to fragments successfully",
        filename: file.originalname,
        storedAs: storedFilename,
        size: file.size,
        fragmentsCount: fragments.fragmentsCount,
        dataSize: fragments.dataSize,
        fragments: fragments.data // Base64 encoded fragments
      });
    }

     return res.status(400).send("No fragments generated from IFC file");
	} catch(error) {
    console.error("Error processing IFC file:", error);
    return res.status(500).send("Error processing IFC file");
	}
});

async function exportFragments() {
  if (!fragmentsManager.groups.size) {
    console.log("No fragment groups found");
    return null;
  }

  console.log(`Found ${fragmentsManager.groups.size} fragment group(s)`);
  
  const group = Array.from(fragmentsManager.groups.values())[0];
  const data = fragmentsManager.export(group);

  console.log(`Exported fragments data:`, {
    dataSize: data.byteLength,
    fragmentsCount: group.items ? Object.keys(group.items).length : 0
  });

  // Clear previous fragments before loading new ones
  fragmentsManager.groups.clear();

  return {
    groupInfo: "Fragment group exported successfully",
    dataSize: data.byteLength,
    fragmentsCount: group.items ? Object.keys(group.items).length : 0,
    data: Buffer.from(data).toString("base64")
  };
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
