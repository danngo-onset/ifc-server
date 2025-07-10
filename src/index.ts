import path from "path";

import express, { Request, Response } from "express";

import cors from "cors";

import multer from "multer";

import * as WEBIFC from "web-ifc";
import * as OBC from "@thatopen/components";

import * as StorageUtilities from "./storage-utilities";

const app = express();
const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";

const allowedOrigins = NODE_ENV === "production" ? [
  "https://ifc-viewer2.vercel.app"
] : [
  "http://localhost:3000"
];

StorageUtilities.initStorage();

app
  .use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"]
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

const ifcLoader = components.get(OBC.IfcLoader);

async function setupIfcLoader() {
  try {
    ifcLoader.settings.webIfc.COORDINATE_TO_ORIGIN = true;
    
    // Optionally exclude some categories
    /* const excludedCats = [
      WEBIFC.IFCTENDONANCHOR,
      WEBIFC.IFCREINFORCINGBAR,
      WEBIFC.IFCREINFORCINGELEMENT,
    ];
    for (const cat of excludedCats) {
      ifcLoader.settings.excludedCategories.add(cat);
    } */
    
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

app.get("/fragments/:id", async (req: Request, res: Response) => {
  try {
    const fragments = await StorageUtilities.loadFragmentFromFile(req.params.id);
    
    res.status(200).json({
      fragments: Buffer.from(fragments).toString("base64")
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
    const buffer = new Uint8Array(file.buffer);
    
    try {
      await ifcLoader.load(buffer);
      console.log(`✅ IFC loaded successfully. Fragment groups: ${fragmentsManager.groups.size}`);
    } catch (obcError) {
      console.log("OBC.IfcLoader failed:", (obcError as Error).message);
      throw obcError;
    }
      
    const fragments = await exportFragments();

    const uuid = StorageUtilities.generateUUID();

    if (fragments && fragments.data) {
      // Convert base64 back to Uint8Array for storage
      const fragmentsBuffer = Buffer.from(fragments.data, "base64");

      await StorageUtilities.saveFragmentToFile(
        uuid, 
        new Uint8Array(fragmentsBuffer), 
      );

      return res.status(200).json({ 
        filename: file.originalname,
        id: uuid,
        fragmentsCount: fragments.fragmentsCount,
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
  if (!fragmentsManager.groups.size) return null;
  
  const group = Array.from(fragmentsManager.groups.values())[0];
  const data = fragmentsManager.export(group);

  const properties = group.getLocalProperties();
  console.log("properties", properties);

  // Clear previous fragments before loading new ones
  fragmentsManager.groups.clear();

  return {
    fragmentsCount: group.items ? Object.keys(group.items).length : 0,
    data: Buffer.from(data).toString("base64")
  };
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
