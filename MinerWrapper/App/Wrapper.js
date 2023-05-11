import spawn from "child_process";
import crypto from "crypto";
import fs from 'fs';
import path from "path";
import {
  removeFile,
  isObjEmpty,
  appendUrl,
} from "./Utils.js";
import {
  pythonVenvPath,
  cmdExe,
} from "./DockerHelpers.js";
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
  getBodyOutputTopic,
} from "./BodyUnpacker.js";
import {
  getConfig,
  getMinerResourceOutput,
  getMinerId,
  getMinerLabel,
  getMinerResourceOutputType,
  getMinerResourceOutputExtension,
  getMinerPath,
  getMinerFile,
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
  sendMetadata,
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
    // getProcess(processId).kill(); // Only works for .py, need the code below to stop any process. Likely only works on Windows
    spawn.exec(`taskkill /PID ${processId} /F /T`, (error, stdout, stderr) => {
      if(error) {
        console.log(error);
        updateProcessStatus(processId, statusEnum.Crash, null, error);
      }
      if(stdout) {
        console.log(stdout);
        updateProcessStatus(processId, statusEnum.Complete);
      }
      if(stderr) {
        console.log(stderr);
        updateProcessStatus(processId, statusEnum.Crash, null, stderr);
      }
    });
    return true;   // Process exists and was stopped
  }
  return false;  // Process does not exist, BadRequest 400.
}

export async function processStart(sendProcessId, req, config) {
  const ownUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
  const body = await req.body;
  const minerToRun = config.find(miner => miner.MinerId == getBodyMinerId(body));
  if(!minerToRun) {
    sendProcessId(null, "Invalid request. No miner with that ID. Config may be out of date, consider refreshing the frontend.");
    return;
  }
  
  let resourceId; // Streams will need this to overwrite their output on repository.
  function setResouceId(id) { resourceId = id; } // used in the response handler

  body["ResultFileId"] = crypto.randomUUID(); // Unique name the miner should save its result as.

  const parents = [];
  const getFilesResponse = await getFilesToMine(body, parents);
  if(getFilesResponse && !getFilesResponse.status) {
    sendProcessId(null, getFilesResponse.response);
    return;
  }
  const wrapperArgs = JSON.stringify(body);
  const childProcess = startAndGetProcess(minerToRun, wrapperArgs);
  
  let processId = childProcess.pid;

  // Creating dictionaries to keep track of processes and their status
  setProcess(processId, childProcess);
  setProcessStatusObj(processId, {}); // Create a new empty status object before updating/setting the values.
  updateProcessStatus(processId, statusEnum.Running);
  
  sendProcessId(processId); // Return process id to caller (frontend)
  console.log(`\n\n\nProcess successfully started: ${processId}`);
  
  let firstSend = true;
  let resend = false;
  let tmpInt = 0; // TODO: Delete! Only for print limiting.

  childProcess.stdin.setEncoding = "utf-8";
  // childProcess.stdout.setEncoding = "utf-8"; // TODO: See if this is needed?
  let processOutput = "";
  childProcess.on('exit', function (code, signal) {
    onProcessExit(body, code, signal, processId, processOutput);
  });
  childProcess.stdout.on("data", (data) => {
    processOutput = data.toString().split('\n')[0].trim(); // Only read first line, and ignore white space characters like \r and \n, since that messes up the path.
    data = null;

    let responsePromise;
    if(firstSend) {
      console.log("FirstSend");
      firstSend = false;
      if(processOutput == "STREAM") { // TODO: Consider if this is the best way to see the type of output.
        console.log("IS A STREAM");
        body["StreamTopic"] = getBodyOutputTopic(body);
        responsePromise = sendMetadata(body, minerToRun, ownUrl, parents)
      }
      else {
        responsePromise = sendResourceToRepo(body, minerToRun, ownUrl, parents, processOutput);
      }
    }
    else if(resend) {
      console.log("Resend");
      resend = false;
      responsePromise = updateResourceOnRepo(body, processOutput, resourceId);
    }

    if(responsePromise) {
      responsePromise
      .then((responseObj) => {
        // TODO: Delete this if-statement before hand-in
        if(tmpInt == 0) {
          tmpInt = 1;
          console.log(`Sent file to repository with status ${responseObj.status} and response ${responseObj.response}`);
        }
        sendOrUpdateResponseHandler(responseObj, processId, setResouceId, body);
        resend = true;
      })
      .catch((error) => {
        console.log(`Error with processId ${processId}: ${error}`);
        console.log(error);
        updateProcessStatus(processId, statusEnum.Crash, null, "Error: " + error);
        if(getProcess(processId)) 
          getProcess(processId).kill();
      });
    }
  });
  childProcess.stderr.on("data", (data) => { // Write error output (will always write output from pm4py here.)
    console.log("Logging:" + data);
  });
}

function startAndGetProcess(minerConfig, wrapperArgs){ //TODO: could be moved to a helper file
  const minerPath = getMinerPath(minerConfig);
  const minerFile = getMinerFile(minerConfig);
  let minerFullPath = path.join(minerPath, minerFile);
  console.log("minerFullPath: " + minerFullPath);
  const minerExtension = minerFile.split('.').pop();
  // console.log("miner external: " + minerExternal);

  switch(minerExtension){
    case "py":
      const pythonPath = path.join(minerPath, pythonVenvPath()); // "./Miners/MinerAlphaPy/env/Scripts/python.exe"
      console.log("running as python from path: " + pythonPath);
      return spawn.spawn(pythonPath, [minerFullPath, wrapperArgs]);
      // return spawn.spawn("python", [minerExternal, wrapperArgs]);
    case "exe":
      console.log("running as exe");
      // return spawn.spawn("cmd.exe", ['/c', minerFullPath, wrapperArgs]); // paths may have to be "\\" instead of "/" for cmd??
      return spawn.spawn(cmdExe(), ['/c', minerFullPath, wrapperArgs]); // paths may have to be "\\" instead of "/" for cmd??
    case "jar":
      console.log("running as jar");
      return spawn.spawn('java', ['-jar', minerFullPath, wrapperArgs]);
    default: 
      console.log("Unsupported file extension: " + minerExtension);
      return null;
  }
}

function sendOrUpdateResponseHandler(responseObj, processId, setResouceId, body){ // TODO: could be moved to a helper file
  if(responseObj.status) {
    setResouceId(responseObj.response);
    if(hasStreamInput(body)) {  // If it's a stream, status should be "running"
      updateProcessStatus(processId, statusEnum.Running, responseObj.response);
    }
    else { // If it's a normal miner, a response means it is complete.
      updateProcessStatus(processId, statusEnum.Complete, responseObj.response);
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
    console.log(`MANUALLY STOPPED PROCESS ${processId} WITH KILL REQUEST`);
    deleteFromBothDicts(processId);
  }
  else console.log("PROCESS CODE INVALID! SHOULD NEVER ENTER HERE. CODE: " + code);
  
  if (hasStreamInput(body)) { // TODO: Verify that only stream miners attempt to set dynamic to false.
    console.log("Only stream miners should have a ResourceId at this stage. Changing resource to no longer be dynamic");
    updateMetadata(body, getProcessResourceId(processId), false);
  }

  if(processOutput != "STREAM") { // Shouldn't try to delete output when it's published to a stream
    removeFile(processOutput);            // Deletes miner result file
  }
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
      const fileURL = appendUrl([getMetadataHost(metadataObject), getMetadataResourceId(metadataObject)]).toString();
      console.log("URL to get file: " + fileURL);
      const inputFilePath = `./Tmp/${crypto.randomUUID()}.${getMetadataFileExtension(metadataObject)}`;
      body[key] = inputFilePath;
      const result = await getResourceFromRepo(fileURL, inputFilePath);
      if(!result.status) return result; // If request failed, return the error msg.
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