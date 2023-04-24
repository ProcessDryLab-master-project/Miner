import spawn from "child_process";
import crypto from "crypto";
import fs from 'fs';
import {
  removeFile,
  isObjEmpty,
  appendUrl,
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
  getConfig,
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
  statusEnum,
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
  if(!tmpProcessObj) return null;
  let status = tmpProcessObj.ProcessStatus;
  // let processStatusObjString = JSON.stringify(tmpProcessObj, null, 4); // TODO: Delete on cleanup
  // console.log(`Status dict send:\n${processStatusObjString}`);
  if(status && status != statusEnum.Running) { // if it's defined and it's not statusEnum.Running
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
  const ownUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  const body = await req.body;
  const minerToRun = config.find(miner => miner.MinerId == getBodyMinerId(body));
  
  let resourceId; // Streams will need this to overwrite their output on repository.
  function setResouceId(id) { resourceId = id; } // used in the response handler

  body["ResultFileId"] = crypto.randomUUID(); // Unique name the miner should save its result as.

  const parents = [];
  await getFilesToMine(body, parents);
  const wrapperArgs = JSON.stringify(body);
  const minerExternal = getMinerExternal(minerToRun);
  const minerExtension = minerExternal.split('.').pop();
  console.log("miner external: " + minerExternal);

  const childProcess = startAndGetProcess(minerExtension, minerExternal, wrapperArgs);
  
  let processId = childProcess.pid;

  // Creating dictionaries to keep track of processes and their status
  setProcess(processId, childProcess);
  setProcessStatusObj(processId, {}); // Create a new empty status object before updating/setting the values.
  updateProcessStatus(processId, statusEnum.Running);
  
  sendProcessId(processId); // Return process id to caller (frontend)
  console.log(`\n\n\nProcess successfully started: ${processId}`);
  
  let firstSend = true;
  let resend = false;

  childProcess.stdin.setEncoding = "utf-8";
  // childProcess.stdout.setEncoding = "utf-8"; // TODO: See if this is needed?
  let processOutput = "";
  childProcess.on('exit', function (code, signal) {
    onProcessExit(body, code, signal, processId, processOutput);
  });
  childProcess.stdout.on("data", (data) => {
    processOutput = data.toString().split('\n')[0].trim(); // Only read first line, and ignore white space characters like \r and \n, since that messes up the path.
    data = null;
    // console.log("Process output: " + processOutput + " and resourceId: " + resourceId);
    if(firstSend) { // TODO: Consider if booleans like this is the best approach
      firstSend = false;
      sendResourceToRepo(body, minerToRun, ownUrl, parents, processOutput)
      .then((responseObj) => {
        console.log(`FIRST SEND: Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
        sendOrUpdateResponseHandler(responseObj, setResouceId);
        resend = true;
      })
      .catch((error) => {
        console.log(`Error with processId ${processId}: ${error}`);
        updateProcessStatus(processId, statusEnum.Crash, null, "Repository error response: " + error);
        killProcess(processId);
      });
    }
    else if(resend){
      resend = false;
      updateResourceOnRepo(body, processOutput, resourceId)
      .then((responseObj) => {
        console.log(`RESEND: Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
        sendOrUpdateResponseHandler(responseObj, setResouceId);
        resend = true;
      })
      .catch((error) => {
        console.log(`Error with processId ${processId}: ${error}`);
        updateProcessStatus(processId, statusEnum.Crash, null, "Repository error response: " + error);
        killProcess(processId);
      });
    }
  });
  childProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
    console.log("Logging:" + data);
  });
}

function startAndGetProcess(minerExtension, minerExternal, wrapperArgs){
  switch(minerExtension){
    case "py":
      console.log("running as python");
      return spawn.spawn("python", [minerExternal, wrapperArgs]);
    case "exe":
      console.log("running as exe");
      return spawn.spawn("cmd.exe", ['/c', minerExternal, wrapperArgs]); // paths have to be "\\" instead of "/" for cmd??
    case "jar":
      console.log("running as jar");
      return spawn.spawn('java', ['-jar', minerExternal, wrapperArgs]);
    default: 
      console.log("Unsupported file extension: " + minerExtension);
      return null;
  }
}

function sendOrUpdateResponseHandler(responseObj, setResouceId){
  if(responseObj.status) {
    setResouceId(responseObj.response);
    if(hasStreamInput(body)) {  // If it's a stream, status should be "running"
      updateProcessStatus(processId, statusEnum.Running, resourceId);
    }
    else { // If it's a normal miner, a response means it is complete.
      updateProcessStatus(processId, statusEnum.Complete, resourceId);
    }
  }
  else {
    updateProcessStatus(processId, statusEnum.Crash, null, "Repository error response: " + responseObj.response);
  }
}

function onProcessExit(body, code, signal, processId, processOutput) {
  console.log(`Child process exited with code: ${code} and signal ${signal}`);
  deleteFromProcessDict(processId);// Remove only from this dict
  if(getProcessStatus(processId) == statusEnum.Crash) return; // Likely means repository crashed.
  if (code == 0) { // Only normal miners should enter here, since stream miners never stop by themselves.
    console.log("Process completed successfully");
    // updateProcessStatus(processId, statusEnum.Complete); // No longer needed, since we stop the process
  }
  else if (code == 1) // Means the miner process crashed
    updateProcessStatus(processId, statusEnum.Crash);
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
      const fileURL = appendUrl(getMetadataHost(metadataObject), getMetadataResourceId(metadataObject)).toString();
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
  if(!getProcessStatusObj(processId)) return; // If object doesn't exist, it means it's been deleted in another thread. Then we don't do anything.
  if(processStatus) setProcessStatus(processId, processStatus);
  if(resourceId) setProcessResourceId(processId, resourceId);
  if(errorMsg) setProcessError(processId, errorMsg);
}