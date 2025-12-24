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
