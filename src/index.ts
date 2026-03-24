import { serve } from "bun";
import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";
import index from "./index.html";

dotenv.config();

/* ================= ENV ================= */

const MONGO_URI = process.env.MONGO_URI!;
const DB_NAME = process.env.DB_NAME || "iot_playground";
const PORT = Number(process.env.PORT) || 3000;

/* ================= DB ================= */

const client = new MongoClient(MONGO_URI);
await client.connect();

const db = client.db(DB_NAME);

console.log("✅ MongoDB connected");

/* ================= TYPES ================= */

type AnyObject = Record<string, any>;

/* ================= HELPERS ================= */

const parseBody = async (req: Request): Promise<AnyObject> => {
  const contentType = req.headers.get("content-type") || "";

  try {
    // JSON
    if (contentType.includes("application/json")) {
      return await req.json();
    }

    // RAW (IoT GSM / BG95)
    if (contentType.includes("application/octet-stream")) {
      const buffer = await req.arrayBuffer();
      const text = new TextDecoder().decode(buffer);

      const parsed: AnyObject = {};
      text.split("\n").forEach(line => {
        const [key, value] = line.split(":");
        if (key && value) parsed[key.trim()] = value.trim();
      });

      return { raw: text, ...parsed };
    }

    // fallback (text/plain etc.)
    const text = await req.text();
    return { raw: text };
  } catch {
    return {};
  }
};

/* ================= SERVER ================= */

const server = serve({
  port: PORT,

  routes: {
    "/*": index,

    /* ================= CREATE ================= */
    "/iot/:collection": {
      async POST(req) {
        const collection = db.collection(req.params.collection);
        const body = await parseBody(req);

        const doc = {
          ...body,
          createdAt: new Date(),
        };

        const result = await collection.insertOne(doc);

        return Response.json({
          success: true,
          result,
          id: result.insertedId,
        });
      },
    },

    /* ================= READ ALL ================= */
    "/iot/:collection/all": async req => {
      const collection = db.collection(req.params.collection);

      const data = await collection.find().toArray();

      return Response.json(data);
    },

    /* ================= READ ONE ================= */
    "/iot/:collection/:id": async req => {
      const collection = db.collection(req.params.collection);

      const data = await collection.findOne({
        _id: new ObjectId(req.params.id),
      });

      return Response.json(data);
    },

    /* ================= UPDATE ================= */
    "/iot/:collection/:id/update": {
      async POST(req) {
        const collection = db.collection(req.params.collection);
        const body = await parseBody(req);

        await collection.updateOne(
          { _id: new ObjectId(req.params.id) },
          { $set: body }
        );

        return Response.json({
          success: true,
        });
      },
    },

    /* ================= DELETE ================= */
    "/iot/:collection/:id/delete": async req => {
      const collection = db.collection(req.params.collection);

      await collection.deleteOne({
        _id: new ObjectId(req.params.id),
      });

      return Response.json({
        success: true,
      });
    },

    /* ================= UPSERT (BEST FOR IoT) ================= */
    "/iot/:collection/upsert": {
      async POST(req) {
        const collection = db.collection(req.params.collection);
        const body = await parseBody(req);

        const deviceId =
          body.device_id || body.deviceId || "unknown-device";

        await collection.updateOne(
          { device_id: deviceId },
          {
            $set: {
              ...body,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        return Response.json({
          success: true,
          deviceId,
        });
      },
    },
  },

  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 IoT Server running at http://localhost:${PORT}`);