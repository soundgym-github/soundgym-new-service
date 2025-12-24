const express = require("express");
const multer = require("multer");
const crypto = require("crypto");
const { Storage } = require("@google-cloud/storage");

const app = express();
app.use(express.json());

// 공개 엔드포인트
app.get("/", (req, res) => res.send("ok - cloud run"));
app.get("/health", (req, res) => res.json({ ok: true }));
app.get("/version", (req, res) =>
  res.json({
    service: process.env.K_SERVICE,
    revision: process.env.K_REVISION,
    time: new Date().toISOString(),
  })
);

// API KEY 미들웨어
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!process.env.API_KEY) return res.status(500).send("API_KEY not set");
  if (key !== process.env.API_KEY) return res.status(401).send("Unauthorized");
  next();
}

// 공개 API
app.get("/v1/public", (req, res) => {
  res.json({ ok: true, message: "public endpoint" });
});

// 보호된 API
app.post("/v1/secure-task", requireApiKey, (req, res) => {
  res.json({ ok: true, received: req.body });
});

app.get("/secret", requireApiKey, (req, res) => {
  res.json({ secret: "this-is-protected" });
});

// ---- GCS 업로드 ----
const storage = new Storage();
const bucketName = process.env.BUCKET_NAME;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// ✅ 업로드: multipart/form-data, field name = "image"
app.post("/v1/upload", requireApiKey, upload.single("image"), async (req, res) => {
  try {
    if (!bucketName) {
      return res.status(500).json({ ok: false, error: "BUCKET_NAME is not set" });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file. Use form-data field name: "image"' });
    }

    const mime = req.file.mimetype;
    const ext =
      mime === "image/png" ? ".png" :
      mime === "image/webp" ? ".webp" :
      mime === "image/jpeg" ? ".jpg" : null;

    if (!ext) {
      return res.status(400).json({ ok: false, error: "Only png, jpg, webp allowed" });
    }

    const rand = crypto.randomBytes(8).toString("hex");
    const objectName = `uploads/${Date.now()}_${rand}${ext}`;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectName);

    await file.save(req.file.buffer, {
      contentType: mime,
      resumable: false,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    // Signed URL (1시간)
    const [signedUrl] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 1000 * 60 * 60,
    });

    res.json({
      ok: true,
      imageId: objectName,
      bucket: bucketName,
      signedUrl,
      contentType: mime,
      size: req.file.size,
    });
  } catch (err) {
    console.error("upload error:", err);
    res.status(500).json({ ok: false, error: "Upload failed" });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("listening on", port));
