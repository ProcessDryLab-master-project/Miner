import spawn from "child_process";
import crypto from "crypto";
import path from "path";
import { removeFile, appendUrl } from "./Utils.js";
import { pythonVenvPath, cmdExe } from "./OSHelper.js";
import { getMinerPath, getMinerFile } from "./ConfigUnpacker.js";
import {
  getBodyAllMetadata,
  getBodySingleMetadata,
  getBodyMinerId,
  hasStreamInput,
  metadataIsStream,
  getMetadataResourceId,
  getMetadataFileExtension,
  getMetadataHost,
  getBodyOutputTopic,
} from "./BodyUnpacker.js";
import {
  statusEnum,
  getProcessStatusObj,
  setProcessStatusObj,
  getProcessStatus,
  getProcessResourceId,
  deleteFromBothDicts,
  deleteFromProcessDict,
  getProcessList,
  getProcess,
  setProcess,
  updateProcessStatus
} from "./ProcessHelper.js";
import {
  sendResourceToRepo,
  updateResourceOnRepo,
  getResourceFromRepo,
  updateMetadata,
  sendMetadata,
} from "../API/RequestHandlers.js";

export async function processStart(sendProcessId, body, ownUrl, config) {
  const minerToRun = config.find(miner => miner.MinerId == getBodyMinerId(body));
  if(!minerToRun) {
    sendProcessId(null, "Invalid request. No miner with that ID. Config may be out of date, consider refreshing the frontend.");
    return;
  }

  body["ResultFileId"] = crypto.randomUUID(); // TODO: This is a unique name the miner could save its result as. It can also be just be created by the miner, it doesn't matter.
  const parents = [];
  const getFilesResponse = await getFilesToMine(body, parents);
  if(getFilesResponse) { // The function only returns something if things went wrong.
    sendProcessId(null, "Error when retrieving resource from Repository: " + getFilesResponse.data);
    return;
  }
  const wrapperArgs = JSON.stringify(body);
  const childProcess = startAndGetProcess(minerToRun, wrapperArgs);
  childProcess.stdin.setEncoding = "utf-8";
  const processId = childProcess.pid;

  setProcess(processId, childProcess); // Creating dictionaries to keep track of processes and their status
  setProcessStatusObj(processId, {}); // Create a new empty status object before updating/setting the values.
  updateProcessStatus(processId, statusEnum.Running);
  
  sendProcessId(processId); // Return process id to caller (frontend)
  console.info(`\n\n\nProcess successfully started: ${processId}`);

  childProcessRunningHandler(childProcess, ownUrl, body, minerToRun, parents, processId);
}

export function getProcessStatusList() {
  return getProcessList();
}

export async function getStatusDeleteIfDone(processId) {
  let tmpProcessObj = getProcessStatusObj(processId);
  if(!tmpProcessObj) return null;
  let status = tmpProcessObj.ProcessStatus;
  if(status && status != statusEnum.Running) { // if it's defined and it's not statusEnum.Running
    console.log(`Removing inactive process with status ${status}`);
    deleteFromBothDicts(processId);
  }
  return tmpProcessObj;
}

export async function stopProcess(processId) {
  console.log(`Attempting to kill process with ID: ${processId}`);
  if(getProcess(processId)) {
    updateProcessStatus(processId, statusEnum.Complete);
    spawn.exec(`taskkill /PID ${processId} /F /T`, (stdout) => {
      if(stdout) {
        console.log(stdout);
      }
    });
    return true;   // Process exists and was stopped
  }
  return false;  // Process does not exist, BadRequest 400.
}

function onProcessExit(body, code, signal, processId) {
  console.log(`Child process exited with code: ${code} and signal ${signal}`);
  deleteFromProcessDict(processId);
  if(getProcessStatus(processId) == statusEnum.Crash) return; // Likely means repository crashed.
  
  if (hasStreamInput(body)) { // TODO: Verify that only stream miners attempt to set dynamic to false.
    console.log("Only stream miners should have a ResourceId at this stage. Changing resource to no longer be dynamic");
    updateMetadata(body, getProcessResourceId(processId), false);
  }

  if (code == 0) { // Refers to completion exit code only for file miners.
    console.log("Process completed successfully");
  }
  else if (code == 1) { // Code 1 means it either crashed or was stopped manually. Stopping it manually will set status to Complete, meaning this won't be able to set it to Crash
    if(getProcessStatus(processId) == statusEnum.Complete) { // Entering this means a process was manually stopped
      deleteFromBothDicts(processId);
    }
    else {
      updateProcessStatus(processId, statusEnum.Crash); 
    }
  }
  else if (signal = "SIGTERM") { // Enters here if a process is killed if a different way (externally from this code, e.g. shutting down the process through the os). Leaving it in case the signal is still useful.
    console.log(`MANUALLY STOPPED PROCESS ${processId} WITH KILL REQUEST`);
    deleteFromBothDicts(processId);
  }
  else console.error("PROCESS CODE INVALID! SHOULD NEVER ENTER HERE. CODE: " + code);

  for(let key in getBodyAllMetadata(body)){ // Deletes all downloaded files from repo
      removeFile(body[key]); // body[key] should hold the path to downloaded resources.
  }
}

function childProcessRunningHandler(childProcess, ownUrl, body, minerToRun, parents, processId) {
  let resourceId; // Streams needs this to overwrite their output on repository.
  function setResouceId(id) { resourceId = id; } // used in the response handler

  let firstSend = true;
  let resend = false;
  let processOutput = "";
  childProcess.on('exit', function (code, signal) {
    onProcessExit(body, code, signal, processId);
  });
  childProcess.stdout.on("data", (data) => {
    processOutput = data.toString().split('\n')[0].trim(); // Only read first line, and ignore white space characters like \r and \n, since that messes up the path.
    data = null;
    let responsePromise;
    if(firstSend) {
      console.log("FirstSend");
      firstSend = false;
      if(processOutput == "STREAM") {
        responsePromise = sendMetadata(body, minerToRun, ownUrl, parents)
      }
      else {
        responsePromise = sendResourceToRepo(body, minerToRun, ownUrl, parents, processOutput);
      }
    }
    else if(resend) {
      resend = false;
      responsePromise = updateResourceOnRepo(body, processOutput, resourceId);
    }

    if(responsePromise) {
      responsePromise
      .then((responseObj) => {
        console.log(`Sent result to repository with status ${responseObj.status} and response ${responseObj.response}`);
        sendOrUpdateResponseHandler(responseObj, processId, setResouceId, body);
        removeFile(processOutput);
        resend = true;
      })
      .catch((error) => {
        console.error(`Error with processId ${processId}: ${error}`);
        console.error(error);
        // TODO: Starting a stream miner and then stopping and starting a repository will mark it as crashed, but won't stop the stream miner. Find out why.
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

function startAndGetProcess(minerConfig, wrapperArgs){
  const minerPath = getMinerPath(minerConfig);
  const minerFile = getMinerFile(minerConfig);
  const minerFullPath = path.join(minerPath, minerFile);
  const minerExtension = minerFile.split('.').pop();
  console.log("startAndGetProcess: " + {
    minerPath: minerPath,
    minerFile: minerFile,
    minerFullPath: minerFullPath,
    minerExtension: minerExtension,
  });

  switch(minerExtension){
    case "py":
      const pythonPath = path.join(minerPath, pythonVenvPath()); // "./Miners/MinerAlphaPy/env/Scripts/python.exe"
      console.log("running as python from path: " + pythonPath);
      return spawn.spawn(pythonPath, [minerFullPath, wrapperArgs]);
    case "exe":
      console.log("running as exe");
      return spawn.spawn(cmdExe(), ['/c', minerFullPath, wrapperArgs]);
    case "jar":
      console.log("running as jar");
      return spawn.spawn('java', ['-jar', minerFullPath, wrapperArgs]);
    default: 
      console.error("Unsupported file extension: " + minerExtension);
      return null;
  }
}

function sendOrUpdateResponseHandler(responseObj, processId, setResouceId, body){
  if(responseObj.status) {
    setResouceId(responseObj.response);
    if(hasStreamInput(body) || getBodyOutputTopic(body)) {  // Stream miners and publishers continue running after sending the first result.
      updateProcessStatus(processId, statusEnum.Running, responseObj.response);
    }
    else { // Non-stream miners complete and send the file.
      updateProcessStatus(processId, statusEnum.Complete, responseObj.response);
    }
  }
  else {
    updateProcessStatus(processId, statusEnum.Crash, null, "Repository error response: " + responseObj.response);
  }
}

async function getFilesToMine(body, parents) {
  for(let key in getBodyAllMetadata(body)) { // Loop through all input resources
    const metadataObject = getBodySingleMetadata(body, key);
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
      console.log("get resources result: ");
      console.log(result);
      if(result.status !== 200) return result; // If status is undefined or error code, return the error msg.
    }
  }
}