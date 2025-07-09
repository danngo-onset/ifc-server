import express, { Request, Response } from "express";

import * as OBC from "@thatopen/components";

const app = express();
const port = process.env.PORT || 8000;

const components = new OBC.Components();
const fragmentsManager = components.get(OBC.FragmentsManager);

app.get("/fragments", (req: Request, res: Response) => {
  console.log("GET /fragments");
  res.status(200).send("Hello World");
});

app.post("/fragments", async (req: Request, res: Response) => {
	const file: File = req.body.file;

	if (!file) {
		return res.status(400).send("No file provided");
	}

	try {
    const data = await file.arrayBuffer();
    const buffer = new Uint8Array(data);
      
    const fragments = await exportFragments();

    return res.status(200).json({ 
      buffer    : buffer,
      fragments : fragments
    });
	} catch(error) {
    return res.status(500).send("Error exporting fragments");
	}
});

async function exportFragments() {
  if (!fragmentsManager.groups.size) return;

  const group = Array.from(fragmentsManager.groups.values())[0];
  const data = fragmentsManager.export(group);

  return data;
}

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
