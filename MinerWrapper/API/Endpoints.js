// import Wrapper from "./Wrapper.js";
const port = 5000;
import {
  getResourceFromRepo,
  // initiateResourceOnRepo,
  // sendResourceToRepo,
} from "./Requests.js";
import {
  stopProcess,
  getProcessStatus,
  getStatusList,
  processStart,
} from "../Wrapper.js";

export function initEndpoints(app, config) {
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

  app.get(`/status`, async function (req, res) {
    console.log(`Getting a request on /status for status list`);
    let statusList = await getStatusList();
    res.status(200).send(statusList);
  });

  app.get(`/status/:processId`, async function (req, res) {
    let processId = req.params.processId
    console.log(`Getting a request on /status for id ${processId}`);
    let statusDict = await getProcessStatus(processId);
    res.status(200).send(statusDict);
  });
  
  app.delete(`/stop/:processId`, async function (req, res) {
    let processId = req.params.processId
    console.log(`Getting a request on /stop for id ${processId}`);
    let result = await stopProcess(processId);
    if(result) res.status(200).send(`Killed process with ID: ${processId}`)
    else res.status(400).send(`No active process with ID: ${processId}`)
  });

  app.post(`/miner`, async function (req, res) {
    let fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    let body = await req.body;
    const input = body.Input
    const resources = input.Resources;
    const output = body.Output;
    const minerId = body.MinerId;
    const minerToRun = config.find(miner => miner.MinerId == minerId);
    const resourceOutputExtension = minerToRun.ResourceOutput.FileExtension;
    const resourceOutputType = minerToRun.ResourceOutput.ResourceType;
    const pathToExternal = minerToRun.External;
    let isStreamMiner = false;
    let inputKeys = minerToRun.ResourceInput.map(rInput => rInput.Name);

    let parents = [];
    let generatedFrom = {
      SourceHost: fullUrl,
      SourceId: minerToRun.MinerId,
      SourceLabel: minerToRun.MinerLabel,
    }
    // Loop through all input
    for (let i = 0; i < inputKeys.length; i++) {
      const key = inputKeys[i];
      const metadataObject = resources[key];
      if(metadataObject != undefined) { // Maybe loop through input resources instead to avoid this check.
        const inputResourceId = metadataObject.ResourceId;
        const resourceInfo = metadataObject.ResourceInfo;
        const inputResourceType = resourceInfo.ResourceType;

        parents.push({
          ResourceId: inputResourceId,
          UsedAs: key,
        });
        if(inputResourceType == "EventStream") {
          isStreamMiner = true;
        }
        else { // Get all files if it's not a Stream. Streams only take 1 input right now.
        // if (inputResourceType != "EventStream") {
          const inputFileExtension = resourceInfo.FileExtension;
          const fileURL = new URL(inputResourceId, resourceInfo.Host).toString(); // TODO: Maybe don't use new URL as it won't read /resources/ if there is no "/" at the end.
          console.log("URL to get file: " + fileURL);
          const inputFilePath = `./Tmp/${inputResourceId}.${inputFileExtension}`;
          body[key] = inputFilePath; // TODO: Maybe this shouldn't be added to body if it ALWAYS saves to same location?
          let result = await getResourceFromRepo(fileURL, inputFilePath);
          console.log("Result from fetching file: " + result);
        }
      }
    }

    function sendProcessId(processId) {
      console.log(`Sending processId ${processId}`);
      res.send(processId.toString());
    } 
    
    await processStart(sendProcessId, body, pathToExternal, output, parents, generatedFrom, fullUrl, resourceOutputExtension, resourceOutputType, isStreamMiner);
    // send processId (minerResult???)

    // console.log("Wrapper miner result: " + minerResult);
    // console.log("URL to send result: " + output.Host);
    // await sendResourceToRepo(output, parents, generatedFrom, fullUrl, minerResult, resourceOutputExtension, resourceOutputType, overwriteId);
  });

  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
  });
}
