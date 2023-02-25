import Wrapper from "./Wrapper.js";
const port = 5000;
const configPath = "../config.json";
import fs from "fs";
import {
  getResource,
  downloadFile,
  sendResource,
  sendFile,
} from "./Requests.js";
import path from "path";

export default function initEndpoints(app) {
  app.get("/", function (req, res) {
    res.send("Default page");
  });

  app.get("/Ping", function (req, res) {
    res.send("Pong");
  });
  app.get('/api/v1/system/ping', function(req, res){
      res.send('pong');
  });
  app.get("/configurations", function (req, res) {
    console.log("Getting a request on /configurations");
    const file = fs.readFileSync(configPath);
    const json = JSON.parse(file);
    res.send(json);
  });

  app.post("/miner", function (req, res) {
    let body = req.body;
    console.log("Body: " + body);
    const fileURL = new URL(
      path.join(body.endpoint, body.file),
      body.location
    ).toString();
    console.log("URL: " + fileURL);

    let filePath = "./Downloads/running-example.xes";
    downloadFile(fileURL, filePath);

    let result = Wrapper(filePath);

    const resourceURL = new URL(body.endpoint, body.location).toString();
    console.log("URL: " + resourceURL);
    sendFile(resourceURL, result);
    res.send(result);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
