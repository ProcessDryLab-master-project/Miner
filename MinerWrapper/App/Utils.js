import fs from "fs";
import path from "path";
import os from "os";
import spawn from "child_process";
import crypto from "crypto";
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

export function cleanupFiles() {
    let directory = "./Tmp";
    if (!fs.existsSync(directory)){
      fs.mkdirSync(directory);
    }
    fs.readdir(directory, (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlink(path.join(directory, file), (err) => {
                if (err) throw err;
            });
        }
    });
}

export function removeFile(filePath) {
  // if(fs.existsSync(filePath)) { // TODO: Consider alternative to below if we want to make sure the file is there. However, this should never happen so maybe bugs like that should crash the program instead to quickly identify and fix the critical issue
  if(filePath) { // Only delete paths that actually exist. This will prevent crashing when streams are stopped.
    fs.unlink(filePath, (err) => {
      if (err) {
        throw err;
      }

      console.log("Delete File successfully.");
    });
  }
}

export function isObjEmpty (obj) {
  return Object.keys(obj).length === 0;
}

export function appendUrl(baseUrl, urlPath) {
  let concatPath = path.join(baseUrl.toString(), urlPath);
  return new URL(concatPath);
}

export function createVirtualEnvironmentString() {
  return {
    command: "python",
    args: "-m venv env"
  };
}

const getDirectories = minerDir => fs.readdirSync(minerDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

export function initAllVenv(configList) {
  // const getDirectories = getDirectories;

  configList.forEach(config => {
    initSingleVenv(config);
  });
}

// export function getDirectories() {
//   return minerDir => fs.readdirSync(minerDir, { withFileTypes: true })
//     .filter(dirent => dirent.isDirectory())
//     .map(dirent => dirent.name);
// }

export function initSingleVenv(config) {
  const venvName = "env";
  const minerPath = getMinerPath(config);
  const venvPath = path.join(minerPath, venvName);
  const pipPath = path.join(minerPath, pipVenvPath());

  const requirementsPath = path.join(minerPath, "requirements.txt");
  const minerFile = getMinerFile(config);

  const minerExtension = minerFile.split('.').pop();
  if (minerExtension == "py" && !getDirectories(minerPath).includes(venvName)) {
    let venvProcess = spawn.spawn("python", ["-m", "venv", venvPath]);
    console.log(`Started creating venv for \"${minerFile}\" with pid: \"${venvProcess.pid}\"`);

    venvProcess.on('exit', function (code, signal) {
      let requirementsProcess = spawn.spawn(pipPath, ["install", "-r", requirementsPath]);
      console.log(`Finished venv process with id \"${venvProcess.pid}\" for \"${minerFile}\". Installing requirements with pid \"${requirementsProcess.pid}\"`); //  via \"${pipPath}\" from file \"${requirementsPath}\"

      requirementsProcess.on('exit', function (code, signal) {
        console.log(`Finished requirements process with id \"${requirementsProcess.pid}\" for \"${minerFile}\". Program is ready to run.`);
      });
    });
  }
}

export function pythonVenvPath() {
  switch(os.type()) {
    case "Windows_NT":
      return "env\\Scripts\\python.exe";
    case "Linux":
      return "env\\bin\\python"; // Don't know if child_process wants source as a command and the rest as args. If it doesn't work, try splitting it up.
    default:
      throw new Error("Unsupported OS");
  }
}

export function pipVenvPath() {
  switch(os.type()) {
    case "Windows_NT":
      return "env\\Scripts\\pip.exe";
    case "Linux":
      return "env\\bin\\pip"; // Don't know if child_process wants source as a command and the rest as args. If it doesn't work, try splitting it up.
    default:
      throw new Error("Unsupported OS");
  }
}

export function installDependenciesString() {
  return {
    command: "pip",
    args: "install -r requirements.txt"
  };
}

export function createDependenciesFileForVenv() {
  return {
    command: "pip",
    args: "freeze > requirements.txt"
  };
}