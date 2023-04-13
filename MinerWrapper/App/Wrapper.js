import spawn from "child_process";
import crypto from "crypto";
import fs from 'fs';
import {
  removeFile,
} from "./Utils.js";
import {
  getBodyInput,
  getMetadataList,
  getSingleMetadata,
  getBodyOutput,
  getBodyOutputHost,
  getBodyOutputHostInit,
  getBodyOutputLabel,
  getBodyMinerId,
  getMetadataResourceId,
  getMetadataResourceInfo,
  getMetadataResourceType,
  getMetadataFileExtension,
  getMetadataHost,
} from "./BodyUnpacker.js";
import {
  getMinerResourceOutput,
  getMinerId,
  getMinerLabel,
  getMinerResourceOutputType,
  getMinerResourceOutputExtension,
  getMinerExternal,
  getMinerResourceInput,
  getMinerResourceInputKeys,
} from "./ConfigUnpacker.js";
import {
  sendResourceToRepo,
  getResourceFromRepo,
  updateMetadata,
} from "../API/Requests.js";

var processDict = {
  someId: null, // TODO: Just here for testing, delete when cleaning up
};
var processStatusDict = {
  someId: {                 // TODO: Just here for testing, delete when cleaning up
    ProcessStatus: "crash", // running, complete, crash,
    ResourceId: null,       // The id for a resource
    Error: null,            // If something went wrong, this is where we put the error msg.
  }
};

export async function getStatusList() {
  let processStatusList = [];
  for(var processId in processStatusDict){
    let tmpStatusObj = processStatusDict[processId];
    tmpStatusObj.ProcessId = processId;
    processStatusList.push(tmpStatusObj)
  }
  return processStatusList;
}

export async function getProcessStatus(processId) {
  let processStatusObj = processStatusDict[processId];
  if(processStatusObj == undefined) {
    return false;
  }
  else {
    // console.log(`Returning process status for id: ${processId}`);
    if(processStatusObj.ProcessStatus != "running"){
      console.log(`Removing inactive process with status ${processStatusObj.ProcessStatus}`);
      deleteFromProcessDict(processId); // cleanup dictionary if process is no longer running
    }
    // let processStatusObjString = JSON.stringify(processStatusObj, null, 4); // TODO: Delete on cleanup
    // console.log(`Status dict send:\n${processStatusObjString}`);
    return processStatusObj;
  }
}

export async function stopProcess(processId) {
  console.log(`Attempting to kill process with ID: ${processId}`);
  if(processDict[processId] == undefined) {
    return false; // Process does not exist, BadRequest 400.
  }
  else {
    processDict[processId]?.kill(); // TODO: Consider if it's a good idea to fix problem with null check like this
    return true;  // Process exists and was stopped
  }
}

export async function processStart(sendProcessId, req, config) {
  let ownUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  let body = await req.body;
  const minerToRun = config.find(miner => miner.MinerId == getBodyMinerId(body));
  const minerToRun2 = config.find(miner => miner.MinerId == body.MinerId);
  // const input = body.Input
  // const resources = input.Resources;
  // const bodyOutput = body.Output;
  // const minerId = getBodyMinerId(body);
  // const resourceOutputExtension = minerToRun.ResourceOutput.FileExtension;
  // const resourceOutputType = minerToRun.ResourceOutput.ResourceType;
  // const pathToExternal = minerToRun.External;
  // let inputKeys = minerToRun.ResourceInput.map(rInput => rInput.Name);
  
  let resourceId; // Streams will need this to overwrite their output on repository.
  let resultFileId = crypto.randomUUID(); // Unique name the miner should save its result as.
  body["ResultFileId"] = resultFileId;

  let savedFilePaths = [];
  let parents = [];
  let isStreamMiner = await getFilesToMine(body, minerToRun, parents, savedFilePaths);
  let wrapperArgs = JSON.stringify(body);
  let pythonProcess = spawn.spawn("python", [getMinerExternal(minerToRun), wrapperArgs]);
  let processId = pythonProcess.pid;

  // Create dictionaries to keep track of processes and their status
  processDict[processId] = pythonProcess;
  updateProcessStatus(processId, "running");
  
  sendProcessId(processId); // Return process id to caller (frontend)
  console.log(`\n\n\nProcess successfully started: ${processId}`);
  console.log(`Process added to dict: ${Object.keys(processDict)}`);
  
  let canSend = true;

  pythonProcess.stdin.setEncoding = "utf-8";
  let processOutput = "";
  pythonProcess.on('exit', function (code, signal) {
    onProcessExit(code, signal, processId, savedFilePaths);
  });
  pythonProcess.stdout.on("data", (data) => {
    processOutput = data.toString();
    data = null;
    processOutput = processOutput.trim();
    // console.log("Process output: " + processOutput + " and resourceId: " + resourceId);
    // TODO: Some "updateResourceOnRepo" function, that makes a PUT request instead of sending OverwriteId. 
    if(canSend) {
      canSend = false;
      sendResourceToRepo(body, minerToRun, ownUrl, parents, processOutput, resourceId, isStreamMiner)
      .then((responseObj) => {
        console.log(`WRAPPER: Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
        if(responseObj.status) {
          resourceId = responseObj.response;
          updateProcessStatus(processId, "running", resourceId);
        }
        else updateProcessStatus(processId, "crash", null, "Repository error response: " + responseObj.response);
        canSend = true;
      })
      .catch((error) => {
        updateProcessStatus(processId, "crash", null, "Repository error response: " + error);
        console.log(`Error with processId ${processId}: ${error}`);
        processDict[processId]?.kill(); // TODO: Consider if it's a good idea to fix problem with null check like this
        // delete processDict[processId];
      });
    }
  });
  pythonProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
    console.log("Logging:" + data);
  });
}


function onProcessExit(code, signal, processId, savedFilePaths) {
  console.log(`Child process exited with code: ${code} and signal ${signal}`);
  delete processDict[processId]; // Remove only from this dict
  if(processStatusDict[processId].ProcessStatus == "crash") return; // Likely means repository crashed.
  if (code == 0)
    updateProcessStatus(processId, "complete");
  else if (code == 1)
    updateProcessStatus(processId, "crash");
  else if (signal = "SIGTERM") { // This signal will be output if the childprocess is killed with stop request.
    console.log("MANUALLY STOPPED PROCESS WITH KILL REQUEST");
    if (processStatusDict[processId].ResourceId) {
      console.log("Only stream miners should have a ResourceId at this stage. Changing resource to no longer be dynamic");
      updateMetadata(getBodyOutputHostInit(body), processStatusDict[processId].ResourceId, false);
    }
    deleteFromProcessDict(processId);
  }
  else console.log("PROCESS CODE INVALID! SHOULD NEVER ENTER HERE. CODE: " + code);
  
  savedFilePaths.forEach(path => {
    removeFile(path);
  });
}

async function getFilesToMine(body, minerToRun, parents, savedFilePaths) {
  let inputKeys = getMinerResourceInputKeys(minerToRun);

  let isStreamMiner = false;
  // Loop through all input resources
  for (let i = 0; i < inputKeys.length; i++) {
    const key = inputKeys[i];
    const metadataObject = getSingleMetadata(body, key);
    if (metadataObject != undefined) { // Maybe loop through input resources instead to avoid this check.
      // const inputResourceId = metadataObject.ResourceId;
      // const resourceInfo = metadataObject.ResourceInfo;
      // const inputResourceType = resourceInfo.ResourceType;

      parents.push({
        ResourceId: getMetadataResourceId(metadataObject),
        UsedAs: key,
      });
      if (getMetadataResourceType(metadataObject) == "EventStream") {
        isStreamMiner = true;
      }
      else { // Get all files if it's not a Stream. Streams only take 1 input right now.
        // const inputFileExtension = resourceInfo.FileExtension;
        const fileURL = new URL(getMetadataResourceId(metadataObject), getMetadataHost(metadataObject)).toString(); // TODO: Maybe don't use new URL as it won't read /resources/ if there is no "/" at the end.
        console.log("URL to get file: " + fileURL);
        const inputFilePath = `./Tmp/${getMetadataResourceId(metadataObject)}.${getMetadataFileExtension(metadataObject)}`;
        savedFilePaths.push(inputFilePath);
        body[key] = inputFilePath; // TODO: Maybe this shouldn't be added to body if it ALWAYS saves to same location?
        let result = await getResourceFromRepo(fileURL, inputFilePath);
        console.log("Result from fetching file: " + result);
      }
    }
  }
  return isStreamMiner;
}

// HELPER FUNCTIONS!
function updateProcessStatus(processId, processStatus, resourceId, errorMsg){
  if(!processStatusDict[processId]) processStatusDict[processId] = {};
  processStatusDict[processId].ProcessStatus = processStatus ? processStatus : processStatusDict[processId].ProcessStatus
  processStatusDict[processId].ResourceId = resourceId ? resourceId : processStatusDict[processId].ResourceId
  processStatusDict[processId].Error = errorMsg ? errorMsg : processStatusDict[processId].Error
  // let processStatusObjString = JSON.stringify(processStatusDict[processId], null, 4); // TODO: Delete on cleanup
  // console.log(`Status dict update:\n${processStatusObjString}`);
}
function deleteFromProcessDict(processId){
  delete processDict[processId];
  delete processStatusDict[processId];
}