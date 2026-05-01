import path from "path";

import express, { type Request, type Response } from "express";

import cors from "cors";

import multer from "multer";

import { IfcImporter } from "@thatopen/fragments";

import * as StorageUtilities from "./storage-utilities";

const app = express();
const PORT = process.env.PORT || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";

const allowedOrigins = NODE_ENV === "production" ? [
  "https://ifc-viewer2.vercel.app"
] : [
  "http://localhost:3000"
];

app
  .use(cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    exposedHeaders: ["X-Fragments-Id"]
  }))
  .use(express.json());


// Configure multer for file uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024 // 1GB limit
  }
});

const ifcImporter = new IfcImporter();
const wasmPath = path.join(process.cwd(), "node_modules/web-ifc/");
ifcImporter.wasm = { absolute: true, path: wasmPath.endsWith("/") ? wasmPath : wasmPath + "/" };


app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Hello World");
});

app.get("/fragments/:id", async (req: Request, res: Response) => {
  try {
    const fragments = await StorageUtilities.loadFragmentFromFile(req.params.id);
    
    return res.status(200)
              .setHeader("Content-Type", "application/octet-stream")
              .send(fragments);
  } catch (error) {
    console.error("Error getting fragments:", error);
    res.status(500).json({ error: "Error retrieving fragments" });
  }
});

app.post("/fragments", upload.single("file"), async (req: Request, res: Response) => {
	const file = req.file;

	if (!file) return res.status(400).send("No file provided");

	try {
    const fragments = await ifcImporter.process({
      bytes: new Uint8Array(file.buffer)
    });

    console.log(`✅ Fragments generated: ${fragments.byteLength} bytes`);

    const uuid = crypto.randomUUID();

    if (fragments) {
      await StorageUtilities.saveFragmentToFile(uuid, fragments);

      return res.status(200)
                .setHeader("Content-Type", "application/octet-stream")
                .setHeader("X-Fragments-Id", uuid)
                .send(Buffer.from(fragments));
    }

    return res.status(400).send("No fragments generated from IFC file");
	} catch(error) {
    console.error("Error processing IFC file:", error);
    return res.status(500).send("Error processing IFC file");
	}
});

void (async () => {
  await StorageUtilities.initStorage();

  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
})();

