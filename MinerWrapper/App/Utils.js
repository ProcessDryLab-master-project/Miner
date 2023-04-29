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

export function initVenv(configList) {
  const getDirectories = minerDir =>
  fs.readdirSync(minerDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);



  configList.forEach(config => {
    // TODO: Move all of this into its own function so it can be called from Endpoints, without looping through all of it.
    const venvName = "env";
    const createVenvStr = createVirtualEnvironmentString();
    const installDepStr = installDependenciesString();
    const minerPath = getMinerPath(config);
    const venvPath = path.join(minerPath, venvName);
    const pipPath = path.join(minerPath, pipVenvPath());

    const requirementsPath = path.join(minerPath, "requirements.txt");
    const minerFile = getMinerFile(config);
    const minerExtension = minerFile.split('.').pop();
    if(minerExtension == "py" && !getDirectories(minerPath).includes(venvName)){
      console.log(`Config for ${minerFile} references .py file with no venv`);
      let venvProcess = spawn.spawn("python", ["-m", "venv", venvPath]);
      console.log(`Started creating venv for: ${minerFile} with pid: ${venvProcess.pid}`);
      venvProcess.on('exit', function (code, signal) {
        console.log(`Installing dependencies via ${pipPath} from requirements file ${requirementsPath}`);
        let requirementsProcess = spawn.spawn(pipPath, ["install", "-r", requirementsPath]);
        console.log(`Finished venv process with id ${venvProcess.pid}. Started installing requirements for: ${minerFile} with pid: ${requirementsProcess.pid}`);
        requirementsProcess.on('exit', function (code, signal) {
          console.log(`Finished requirements process with id ${requirementsProcess.pid}. Program is ready to run.`); // TODO: Do something to wait for all requirements to be finished before they can be called
        });
      });
      
      // console.log(`Installing dependencies via ${pipPath} from requirements file ${requirementsPath}`);
      // spawn.spawnSync(pipPath, ["install", "-r", requirementsPath]);
    }
  });
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