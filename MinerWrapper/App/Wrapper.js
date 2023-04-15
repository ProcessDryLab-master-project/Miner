import spawn from "child_process";
import crypto from "crypto";
import fs from 'fs';
import {
  removeFile,
  isObjEmpty,
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
  getProcessStatusObj,
  setProcessStatusObj,
  getProcessStatus,
  getProcessResourceId,
  getProcessError,
  setProcessStatus,
  setProcessResourceId,
  setProcessError,
  deleteFromBothDicts,
  deleteFromProcessDict,
  deleteFromStatusDict,
  getProcessList,
  getProcess,
  setProcess,
  killProcess,
} from "./ProcessHelper.js";
import {
  sendResourceToRepo,
  updateResourceOnRepo,
  getResourceFromRepo,
  updateMetadata,
} from "../API/Requests.js";

export function getProcessStatusList() {
  return getProcessList();
}

export async function getStatusDeleteIfDone(processId) {
  let tmpProcessObj = getProcessStatusObj(processId);
  let status = tmpProcessObj.ProcessStatus;
  // let processStatusObjString = JSON.stringify(tmpProcessObj, null, 4); // TODO: Delete on cleanup
  // console.log(`Status dict send:\n${processStatusObjString}`);

  if(status) {
    console.log("status: " + status);
  }
  if(status != "running") {
    console.log("status != running: ");
    console.log(status != "running");
  }
  if(status && status != "running") { // if it's defined and it's not "running"
    console.log(`Removing inactive process with status ${status}`);
    deleteFromBothDicts(processId);
  }
  return tmpProcessObj;
}

export async function stopProcess(processId) {
  console.log(`Attempting to kill process with ID: ${processId}`);
  if(getProcess(processId)) {
    getProcess(processId).kill();
    return true;   // Process exists and was stopped
  }
  return false;  // Process does not exist, BadRequest 400.
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
  setProcess(processId, pythonProcess);
  updateProcessStatus(processId, "running"); // TODO: Create first. Probably shouldn't create obj in update. Updates should be reserved for existing obj
  
  sendProcessId(processId); // Return process id to caller (frontend)
  console.log(`\n\n\nProcess successfully started: ${processId}`);
  
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
        killProcess(processId);
      });
    }
    else if(!firstSend && canSend){
      canSend = false;
      updateResourceOnRepo(body, processOutput, resourceId)
      .then((responseObj) => {
        console.log(`RESEND: Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
        if (getProcessStatusObj(processId)) {// Don't update process status if it has been deleted (means exit was called in the meantime)
          if(responseObj.status) { 
            resourceId = responseObj.response;
            updateProcessStatus(processId, "running", resourceId);
          }
          else updateProcessStatus(processId, "crash", null, "Repository error response: " + responseObj.response);
          canSend = true;
        }
      })
      .catch((error) => {
        updateProcessStatus(processId, "crash", null, "Repository error response: " + error);
        console.log(`Error with processId ${processId}: ${error}`);
        killProcess(processId);
      });
    }
  });
  pythonProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
    console.log("Logging:" + data);
  });
}


function onProcessExit(body, code, signal, processId, processOutput) {
  console.log(`Child process exited with code: ${code} and signal ${signal}`);
  deleteFromProcessDict(processId);// Remove only from this dict
  if(getProcessStatus(processId) == "crash") return; // Likely means repository crashed.
  if (code == 0)
    updateProcessStatus(processId, "complete");
  else if (code == 1)
    updateProcessStatus(processId, "crash");
  else if (signal = "SIGTERM") { // This signal will be output if the childprocess is killed with stop request.
    console.log("MANUALLY STOPPED PROCESS WITH KILL REQUEST");
    if (getProcessResourceId(processId)) {
      console.log("Only stream miners should have a ResourceId at this stage. Changing resource to no longer be dynamic");
      updateMetadata(body, getProcessResourceId(processId), false);
    }
    deleteFromBothDicts(processId);
  }
  else console.log("PROCESS CODE INVALID! SHOULD NEVER ENTER HERE. CODE: " + code);
  
  removeFile(processOutput);            // Deletes miner result file
  for(let key in getAllMetadata(body)){ // Deletes all downloaded files from repo
      removeFile(body[key]); // body[key] should hold the path to downloaded resources.
  }
}

async function getFilesToMine(body, parents) {
  for(let key in getAllMetadata(body)) { // Loop through all input resources
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
  if(processStatus) setProcessStatus(processId, processStatus);
  if(resourceId) setProcessResourceId(processId, resourceId);
  if(errorMsg) setProcessError(processId, errorMsg);
}