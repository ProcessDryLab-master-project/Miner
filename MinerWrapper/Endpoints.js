import Wrapper from "./Wrapper.js";
const port = 5000;
const configPath = "./configWithParam.json";
// const configPath = "./configNoParam.json";
// const configPath = "./configStream.json";
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
  app.get(`/ping`, function (req, res) {
    res.send("pong");
  });
  app.get(`/configurations`, function (req, res) {
    console.log("Getting a request on /configurations");
    const file = fs.readFileSync(configPath);
    const json = JSON.parse(file);
    res.send(json);
  });

  app.post(`/miner`, async function (req, res) {
    let body = await req.body;
    // let repositoryInputPath = body.input.repositoryPath;
    // let repositoryOutputPath = body.output.repositoryPath;
    // let resourceInputId = body.input.resourceId; // The id for the file we request from repo
    // let fileExtension = body.fileExtension;
    // let logName = `${resourceInputId}.${fileExtension}`;
    // let resourceTypeInput = body.resourceTypeInput;
    // let resourceTypeOutput = body.resourceTypeOutput;
    // let resourceLabel = body.resourceLabel;
    // let fileSavePath = `./Downloads/${logName}`;

    const input = body.Input
    const metadataObject = input.MetadataObject;
    const minerParameters = input.MinerParameters;
    const output = body.Output;
    const inputResourceType = metadataObject.ResourceType;
    const resourceInputId = metadataObject.ResourceID;



    let minerResult;
    if (inputResourceType == "EventStream") {
      console.log("Running as an EventStream");
      let repoResp = await initiateResourceOnRepo(repositoryOutputPath, resourceLabel, resourceTypeOutput, fileExtension);
      console.log("Repo init resp: " + repoResp);
      res.send(repoResp);
      body["overwriteId"] = repoResp;
      minerResult = await Wrapper(body);
    } else {
      const inputResourceId = metadataObject.ResourceID;
      const inputFileExtension = metadataObject.FileInfo.FileExtension;
      const fileURL = new URL(metadataObject.ResourceID, metadataObject.Host).toString(); // TODO: Maybe don't use new URL as it won't read /resources/ if there is no "/" at the end.
      console.log("URL to get file: " + fileURL);
      const inputFilePath = `./Downloads/${inputResourceId}.${inputFileExtension}`;
      let repoGetResp = await getResourceFromRepo(fileURL, inputFilePath);
      body["FileSavePath"] = inputFilePath; // TODO: Maybe this shouldn't be added to body if it ALWAYS saves to same location?
      minerResult = await Wrapper(body);
      console.log("Wrapper miner result: " + minerResult);
      console.log("URL to send result: " + output.Host);
      // Get type of output from own config instead of hardcoding:
      const configFile = fs.readFileSync(configPath);
      const configJson = JSON.parse(configFile);
      let repoPostResp = await sendResourceToRepo(output.Host, minerResult, resourceInputId, configJson.ResourceOutputType);
      console.log("repoPostResp: " + repoPostResp);
      res.send(repoPostResp);
    }

    // console.log("URL to send result: " + repositoryOutputPath);
    // let repoPostResp = await sendResourceToRepo(repositoryOutputPath, minerResult, resourceInputId, resourceTypeOutput);
    // console.log("repoPostResp: " + repoPostResp);
    // res.send(repoPostResp);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
