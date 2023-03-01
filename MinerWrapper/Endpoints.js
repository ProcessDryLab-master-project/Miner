import Wrapper from "./Wrapper.js";
const port = 5000;
const configPath = "../config.json";
import fs from "fs";
import {getResourceFromRepo, sendResourceToRepo} from "./Requests.js";

var endpointStart = "/api/v1/system";
export default function initEndpoints(app) {
  app.get("/", function (req, res) {
    res.send("Default page");
  });

  app.get("/ping", function (req, res) {
    res.send("pong");
  });
  app.get(`${endpointStart}/ping`, function(req, res){
      res.send('pong');
  });
  app.get("/configurations", function (req, res) {
    console.log("Getting a request on /configurations");
    const file = fs.readFileSync(configPath);
    const json = JSON.parse(file);
    res.send(json);
  });

  app.post("/miner", async function (req, res) {
    let body = req.body;
    let repositoryPath = body.repositoryPath;
    let fileName = body.fileName;
    let fileType = body.fileType;
    let logName = `${fileName}.${fileType}`

    const fileURL = new URL(logName, repositoryPath).toString();
    console.log("\n\n\nURL to get file: " + fileURL);

    let fileSavePath = `./Downloads/${logName}`;
    let repoGetResp = await getResourceFromRepo(fileURL, fileSavePath);
    console.log(`Repository response: ${repoGetResp}, Log saved to ${fileSavePath}`);

    let minerResult = await Wrapper(fileSavePath, fileName, fileType);
    console.log("Wrapper miner result: " + minerResult);

    console.log("URL to send result: " + repositoryPath);
    let pnmlFileName = fileName+".pnml";
    console.log("PNML file name: " + pnmlFileName);
    let repoPostResp = await sendResourceToRepo(repositoryPath, minerResult, pnmlFileName);
    res.sendStatus(200);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
