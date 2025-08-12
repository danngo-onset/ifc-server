import path from "path";

import express, { Request, Response } from "express";

import cors from "cors";

import multer from "multer";

import * as FRAGS from "@thatopen/fragments";

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

const ifcImporter = new FRAGS.IfcImporter();
const wasmPath = path.join(process.cwd(), "node_modules/web-ifc/");
ifcImporter.wasm = { absolute: true, path: wasmPath.endsWith("/") ? wasmPath : wasmPath + "/" };


app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Hello World");
});

app.get("/fragments/:id", async (req: Request, res: Response) => {
  try {
    const result = await StorageUtilities.loadFragmentFromFile(req.params.id);
    
    res.status(200).json({
      fragments: Buffer.from(result.fragments).toString("base64"),
      properties: undefined
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
    const fragmentBytes = await ifcImporter.process({
      bytes: new Uint8Array(file.buffer)
    });

    console.log(`✅ Fragments generated: ${fragmentBytes.byteLength} bytes`);

    const uuid = StorageUtilities.generateGUID();

    if (fragmentBytes) {
      await StorageUtilities.saveFragmentToFile(
        uuid, 
        fragmentBytes,
        undefined
      );

      return res.status(200).json({ 
        filename: file.originalname,
        id: uuid,
        fragments: Buffer.from(fragmentBytes).toString("base64"), // Base64 encoded fragments
        properties: undefined // Properties data as JSON string
      });
    }

    return res.status(400).send("No fragments generated from IFC file");
	} catch(error) {
    console.error("Error processing IFC file:", error);
    return res.status(500).send("Error processing IFC file");
	}
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
