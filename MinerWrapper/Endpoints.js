import Wrapper from "./Wrapper.js";
const port = 5000;
import {
  getResourceFromRepo,
  sendResourceToRepo,
  initiateResourceOnRepo,
} from "./Requests.js";

export default function initEndpoints(app, config) {
  // console.log({ "config endpoints": config });
  app.get("/", function (req, res) {
    res.send("Default page");
  });
  app.get(`/ping`, function (req, res) {
    res.send("pong");
  });
  app.get(`/configurations`, function (req, res) {
    console.log("Getting a request on /configurations");
    res.send(config);
  });

  app.post(`/miner`, async function (req, res) {
    let body = await req.body;
    const input = body.Input
    const metadataObject = input.MetadataObject;
    const output = body.Output;
    const inputResourceType = metadataObject.ResourceType;
    const inputResourceId = metadataObject.ResourceId;
    const minerId = body.MinerId;
    const minerToRun = config.find(miner => miner.MinerId == minerId);
    const resourceOutputType = minerToRun.ResourceOutputType;
    const pathToExternal = minerToRun.External;

    let minerResult;
    if (inputResourceType == "EventStream") {
      console.log("Running as an EventStream");
      let repoResp = await initiateResourceOnRepo(output, resourceOutputType);
      res.send(repoResp);
      body["OverwriteId"] = repoResp; // TODO: Maybe this shouldn't be added to body if wrapper takes care of all communication
      minerResult = await Wrapper(body, pathToExternal);
    } 
    else {
      const inputFileExtension = metadataObject.FileInfo.FileExtension;
      const fileURL = new URL(inputResourceId, metadataObject.Host).toString(); // TODO: Maybe don't use new URL as it won't read /resources/ if there is no "/" at the end.
      console.log("URL to get file: " + fileURL);
      const inputFilePath = `./Downloads/${inputResourceId}.${inputFileExtension}`;
      await getResourceFromRepo(fileURL, inputFilePath);
      let overwriteId = await initiateResourceOnRepo(output, resourceOutputType);
      res.send(overwriteId);
      
      body["FileSavePath"] = inputFilePath; // TODO: Maybe this shouldn't be added to body if it ALWAYS saves to same location?
      minerResult = await Wrapper(body, pathToExternal);
      console.log("Wrapper miner result: " + minerResult);

      console.log("URL to send result: " + output.Host);
      await sendResourceToRepo(output, metadataObject, minerResult, resourceOutputType, overwriteId);
    }
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
