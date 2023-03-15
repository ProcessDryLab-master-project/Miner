import Wrapper from "./Wrapper.js";
const port = 5000;
const configPath = "./config.json";
import fs from "fs";
import path from "path";
import {
  getResourceFromRepo,
  sendResourceToRepo,
  initiateResourceOnRepo,
} from "./Requests.js";

// var endpointStart = "/api/v1";
var endpointStart = "";
export default function initEndpoints(app) {
  app.get("/", function (req, res) {
    res.send("Default page");
  });
  app.get(`${endpointStart}/system/ping`, function (req, res) {
    res.send("pong");
  });
  app.get(`${endpointStart}/configurations`, function (req, res) {
    console.log("Getting a request on /configurations");
    const file = fs.readFileSync(configPath);
    const json = JSON.parse(file);
    res.send(json);
  });

  app.post(`${endpointStart}/miner`, async function (req, res) {
    let body = await req.body;
    let repositoryInputPath = body.repositoryInputPath;
    let repositoryOutputPath = body.repositoryOutputPath;
    let incomingFileId = body.fileId; // The id for the file we request from repo
    let fileExtension = body.fileExtension;
    let logName = `${incomingFileId}.${fileExtension}`;
    let resourceTypeInput = body.resourceTypeInput;
    let resourceTypeOutput = body.resourceTypeOutput;
    let resourceLabel = body.resourceLabel;
    // let resourceTypeOutput = "Visualization"; // TODO: Specify the type of resource to be generated. Should miner decide this? Or frontend?
    // let minerParameters = JSON.stringify(body.params);
    let fileSavePath = `./Downloads/${logName}`;

    let minerResult;
    if (resourceTypeInput == "EventStream") {
      console.log("Running as an EventStream");
      let repoResp = await initiateResourceOnRepo(
        repositoryOutputPath,
        resourceLabel,
        resourceTypeOutput,
        fileExtension
      );
      console.log("Repo init resp: " + repoResp);
      res.send(repoResp);
      body["overwriteId"] = repoResp;
      minerResult = await Wrapper(body);
    } else {
      const fileURL = new URL(incomingFileId, repositoryInputPath).toString();
      console.log("\n\n\nURL to get file: " + fileURL);
      let repoGetResp = await getResourceFromRepo(fileURL, fileSavePath);
      body["fileSavePath"] = fileSavePath;
      body["incomingFileId"] = incomingFileId;
      minerResult = await Wrapper(body);
      console.log("Wrapper miner result: " + minerResult);
      console.log("URL to send result: " + repositoryOutputPath);
      let repoPostResp = await sendResourceToRepo(
        repositoryOutputPath,
        minerResult,
        incomingFileId,
        resourceTypeOutput
      );
      console.log("repoPostResp: " + repoPostResp);
      res.send(repoPostResp);
    }

    console.log("URL to send result: " + repositoryOutputPath);
    let repoPostResp = await sendResourceToRepo(
      repositoryOutputPath,
      minerResult,
      incomingFileId,
      resourceTypeOutput
    );
    console.log("repoPostResp: " + repoPostResp);
    res.send(repoPostResp);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
