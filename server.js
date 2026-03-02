const http = require("http");

const port = process.env.PORT ? Number(process.env.PORT) : 8080;

http.createServer((req, res) => {
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("urwaydispatch.com RideShare Engine: Online\n");
}).listen(port, "0.0.0.0", () => {
  console.log("urwaydispatch.com started on", port);
});
