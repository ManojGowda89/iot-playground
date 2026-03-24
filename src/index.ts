import { serve } from "bun";
import { MongoClient, ObjectId } from "mongodb";
import * as dotenv from "dotenv";
import index from "./index.html";
import { keepAlive } from "./job";

dotenv.config();

/* ================= ENV ================= */

const MONGO_URI = process.env.MONGO_URI!;
const DB_NAME = process.env.DB_NAME || "iot_playground";
const PORT = Number(process.env.PORT) || 3000;

/* ================= DB ================= */

const client = new MongoClient(MONGO_URI);
await client.connect();

const db = client.db(DB_NAME);

setInterval(() => {
  keepAlive();
  console.log("✅ Keep-alive ping sent");
}, 5 * 60 * 1000);

console.log("✅ MongoDB connected");

/* ================= TYPES ================= */

type AnyObject = Record<string, any>;

/* ================= SMART PARSER ================= */

const parseBody = async (req: Request): Promise<AnyObject> => {
  const contentType = req.headers.get("content-type") || "";

  try {
    /* ================= JSON ================= */
    if (contentType.includes("application/json")) {
      const data = await req.json();

      // 🔥 If JSON contains raw string → parse it
      if (typeof data.raw === "string") {
        try {
          const parsedRaw = JSON.parse(data.raw);
          return { ...data, ...parsedRaw };
        } catch {
          return data;
        }
      }

      return data;
    }

    /* ================= RAW / IoT ================= */
    const buffer = await req.arrayBuffer();
    const text = new TextDecoder().decode(buffer).trim();

    // 🔥 Try parsing as JSON directly
    try {
      const parsed = JSON.parse(text);
      return parsed;
    } catch {}

    // 🔥 Try key:value format
    const parsed: AnyObject = {};
    let isKeyValue = false;

    text.split("\n").forEach(line => {
      const [key, ...rest] = line.split(":");
      if (key && rest.length) {
        parsed[key.trim()] = rest.join(":").trim();
        isKeyValue = true;
      }
    });

    if (isKeyValue) {
      return { raw: text, ...parsed };
    }

    // 🔥 fallback
    return { raw: text };
  } catch (err) {
    console.error("Parse error:", err);
    return {};
  }
};

/* ================= SERVER ================= */

const server = serve({
  port: PORT,

  routes: {
    "/*": index,

    "/health": () => Response.json({ status: "ok" }),

    /* ================= CREATE ================= */
    "/iot/:collection": {
      async POST(req) {
        const collection = db.collection(req.params.collection);
        const body = await parseBody(req);

        console.log("📥 Incoming:", body);

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

        // 🔥 robust deviceId detection
        const deviceId =
          body.device_id ||
          body.deviceId ||
          body?.raw?.device_id ||
          "unknown-device";

        await collection.updateOne(
          { device_id: deviceId },
          {
            $set: {
              ...body,
              device_id: deviceId,
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