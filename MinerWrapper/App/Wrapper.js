import spawn from "child_process";
import crypto from "crypto";
import fs from 'fs';
import {
  removeFile,
} from "./Utils.js";
import {
  getBodyInput,
  getAllMetadata,
  getSingleMetadata,
  getBodyOutput,
  getBodyOutputHost,
  getBodyOutputHostInit,
  getBodyOutputLabel,
  getBodyMinerId,
  hasStreamInput,
  metadataIsStream,
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
  updateResourceOnRepo,
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
  // let processStatusObjString = JSON.stringify(processStatusObj, null, 4); // TODO: Delete on cleanup
  // console.log(`Status dict send:\n${processStatusObjString}`);
  if(processStatusObj && processStatusObj.ProcessStatus != "running") { // Get status on a non-running process should remove it from the dict.
      console.log(`Removing inactive process with status ${processStatusObj.ProcessStatus}`);
      deleteFromProcessDict(processId); // cleanup dictionary if process is no longer running
  }
  return processStatusObj;
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
  let resourceId; // Streams will need this to overwrite their output on repository.
  let resultFileId = crypto.randomUUID(); // Unique name the miner should save its result as.
  body["ResultFileId"] = resultFileId;

  let parents = [];
  await getFilesToMine(body, parents);
  let wrapperArgs = JSON.stringify(body);
  let pythonProcess = spawn.spawn("python", [getMinerExternal(minerToRun), wrapperArgs]);
  let processId = pythonProcess.pid;

  // Create dictionaries to keep track of processes and their status
  processDict[processId] = pythonProcess;
  updateProcessStatus(processId, "running");
  
  sendProcessId(processId); // Return process id to caller (frontend)
  console.log(`\n\n\nProcess successfully started: ${processId}`);
  console.log(`Process added to dict: ${Object.keys(processDict)}`);
  
  let firstSend = true;
  let canSend = true;

  pythonProcess.stdin.setEncoding = "utf-8";
  let processOutput = "";
  pythonProcess.on('exit', function (code, signal) {
    onProcessExit(body, code, signal, processId, processOutput);
  });
  pythonProcess.stdout.on("data", (data) => {
    processOutput = data.toString().trim();
    data = null;
    // console.log("Process output: " + processOutput + " and resourceId: " + resourceId);
    if(firstSend && canSend) { // TODO: Consider if booleans like this is the best approach
      firstSend = false;
      canSend = false;
      sendResourceToRepo(body, minerToRun, ownUrl, parents, processOutput)
      .then((responseObj) => {
        console.log(`FIRST SEND: Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
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
      });
    }
    else if(!firstSend && canSend){
      canSend = false;
      updateResourceOnRepo(body, processOutput, resourceId)
      .then((responseObj) => {
        console.log(`RESEND: Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
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
      });
    }
  });
  pythonProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
    console.log("Logging:" + data);
  });
}


function onProcessExit(body, code, signal, processId, processOutput) {
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
      updateMetadata(body, processStatusDict[processId].ResourceId, false);
    }
    deleteFromProcessDict(processId);
  }
  else console.log("PROCESS CODE INVALID! SHOULD NEVER ENTER HERE. CODE: " + code);
  
  removeFile(processOutput);            // Deletes miner result file
  for(let key in getAllMetadata(body)){ // Deletes all downloaded files from repo
      removeFile(body[key]); // body[key] should hold the path to downloaded resources.
  }
}

async function getFilesToMine(body, parents) {
  for(let key in getAllMetadata(body)) { // Loop through all input resources
    // TODO: MAYBE. Could have a check like: "if(!getMinerResourceInputKeys(minerToRun).includes("key"))". Would ensure that request keys match config. However, if frontend is made correctly, this shouldn't be possible. Also, doesn't break anything if key doesn't match config.
    const metadataObject = getSingleMetadata(body, key);
    parents.push({
      ResourceId: getMetadataResourceId(metadataObject),
      UsedAs: key,
    });
    if (!metadataIsStream(metadataObject)) { // If it's not a stream, retrieve file from repository
      const fileURL = new URL(getMetadataResourceId(metadataObject), getMetadataHost(metadataObject)).toString(); // TODO: Maybe don't use new URL as it won't read /resources/ if there is no "/" at the end.
      console.log("URL to get file: " + fileURL);
      const inputFilePath = `./Tmp/${crypto.randomUUID()}.${getMetadataFileExtension(metadataObject)}`;
      body[key] = inputFilePath;
      let result = await getResourceFromRepo(fileURL, inputFilePath);
      console.log("Result from fetching file: " + result);
    }
  }
}

// HELPER FUNCTIONS!
function updateProcessStatus(processId, processStatus, resourceId, errorMsg){
  console.log("processId: " + processId);
  if(processStatusDict[processId]?.ProcessStatus == "complete" || processStatusDict[processId]?.ProcessStatus == "crash") return; // If status is "complete" or "crash", it shouldn't be able to change.
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