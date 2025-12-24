const express = require("express");
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
  if (!process.env.API_KEY) {
    return res.status(500).send("API_KEY not set");
  }
  if (key !== process.env.API_KEY) {
    return res.status(401).send("Unauthorized");
  }
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

// 기존 secret 엔드포인트 (원하면 유지)
app.get("/secret", requireApiKey, (req, res) => {
  res.json({ secret: "this-is-protected" });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("listening on", port);
});
