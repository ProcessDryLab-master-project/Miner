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
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
    console.log("fullUrl: " + fullUrl);

    let body = await req.body;
    const input = body.Input
    const resources = input.Resources;
    const output = body.Output;
    const minerId = body.MinerId;
    const minerToRun = config.find(miner => miner.MinerId == minerId);
    const resourceOutputExtension = minerToRun.ResourceOutput.FileExtension;
    const resourceOutputType = minerToRun.ResourceOutput.ResourceType;
    const pathToExternal = minerToRun.External;
    let inputKeys = minerToRun.ResourceInput.map(rInput => rInput.Name)
    console.log(inputKeys);

    let overwriteId = await initiateResourceOnRepo(output, resourceOutputExtension, resourceOutputType);
    res.send(overwriteId);

    let parents = [];
    for (let i = 0; i < inputKeys.length; i++) {
      const key = inputKeys[i];
      const metadataObject = resources[key];
      if(metadataObject != undefined) { // Maybe loop through input resources instead to avoid this check.
        const inputResourceId = metadataObject.ResourceId;
        const resourceInfo = metadataObject.ResourceInfo;
        const inputResourceType = resourceInfo.ResourceType;

        parents.push({
          ResourceId: inputResourceId,
          From: key,
        })
        // Get all files if it's not a Stream. Streams only take 1 input right now.
        if (inputResourceType != "EventStream") {
          const inputFileExtension = resourceInfo.FileExtension;
          const fileURL = new URL(inputResourceId, resourceInfo.Host).toString(); // TODO: Maybe don't use new URL as it won't read /resources/ if there is no "/" at the end.
          console.log("URL to get file: " + fileURL);
          const inputFilePath = `./Downloads/${inputResourceId}.${inputFileExtension}`;
          body[key] = inputFilePath; // TODO: Maybe this shouldn't be added to body if it ALWAYS saves to same location?
          let result = await getResourceFromRepo(fileURL, inputFilePath);
          console.log("Result from fetching file: " + result);
        }
      }
    }

    
    let minerResult = await Wrapper(body, pathToExternal);
    console.log("Wrapper miner result: " + minerResult);

    console.log("URL to send result: " + output.Host);
    await sendResourceToRepo(output, parents, fullUrl, minerResult, resourceOutputExtension, resourceOutputType, overwriteId);
    
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
