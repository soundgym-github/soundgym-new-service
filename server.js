const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("ok - cloud run"));
app.get("/health", (req, res) => res.json({ ok: true }));

app.get("/secret", (req, res) => {
  res.json({
    secret: process.env.SAMPLE_API_KEY || "no-secret",
  });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log("listening on", port);
});

const express = require("express");
const app = express();

app.use(express.json());

// 공개 엔드포인트
app.get("/", (req, res) => res.send("ok - cloud run"));
app.get("/healthz", (req, res) => res.status(200).json({ ok: true }));
app.get("/version", (req, res) =>
  res.json({
    service: process.env.K_SERVICE,
    revision: process.env.K_REVISION,
    time: new Date().toISOString(),
  })
);

// 필요한 기능만 잠글 API 키 미들웨어
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!process.env.API_KEY) return res.status(500).send("API_KEY not set");
  if (key !== process.env.API_KEY) return res.status(401).send("Unauthorized");
  next();
}

// 예시: 비용/민감 기능은 키로 보호
app.post("/v1/secure-task", requireApiKey, (req, res) => {
  res.json({ ok: true, received: req.body });
});

// 예시: 공개 API
app.get("/v1/public", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`listening on ${port}`));
