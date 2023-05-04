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
  writeConfig,
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

export function removeObjectWithId(arr, id) {
  const objWithIdIndex = arr.findIndex((obj) => obj.MinerId === id);

  if (objWithIdIndex > -1) {
    arr.splice(objWithIdIndex, 1);
  }

  return arr;
}

export const getDirectories = directory => fs.readdirSync(directory, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

export function createVirtualEnvironmentString() {
  return {
    command: "python",
    args: "-m venv env"
  };
}

export function initAllVenv(configList) {
  configList.forEach(config => {
    initSingleVenv(config, configList);
  });
}

export function initSingleVenv(config, configList) {
  const venvName = "env";
  const minerPath = getMinerPath(config);
  const venvPath = path.join(minerPath, venvName);
  const pipPath = path.join(minerPath, pipVenvPath());

  const requirementsPath = path.join(minerPath, "requirements.txt");
  const minerFile = getMinerFile(config);

  const minerExtension = minerFile.split('.').pop();
  if (minerExtension == "py" && !getDirectories(minerPath).includes(venvName)) {
    console.log("Miner is missing venv. Temporarily removing from config if exist. ConfigList before: ");
    removeObjectWithId(configList, config.MinerId);

    let venvProcess = spawn.spawn("python", ["-m", "venv", venvPath]);
    console.log(`Started creating venv for \"${minerFile}\" with pid: \"${venvProcess.pid}\"`);

    venvProcess.on('exit', function (code, signal) {
      processExitError(code, signal, venvProcess.pid);
      let requirementsProcess = spawn.spawn(pipPath, ["install", "-r", requirementsPath]);
      console.log(`Finished venv process with id \"${venvProcess.pid}\" for \"${minerFile}\". Installing requirements with pid \"${requirementsProcess.pid}\"`); //  via \"${pipPath}\" from file \"${requirementsPath}\"

      requirementsProcess.on('exit', function (code, signal) {
        processExitError(code, signal, requirementsProcess.pid);
        if(code == 0) {
          console.log(`Finished requirements process with id \"${requirementsProcess.pid}\" for \"${minerFile}\". Program is ready to run.`);
          configList.push(config);
          writeConfig(configList); // TODO: Consider. We're writing to config when starting up, despite no changes to the actual file. However, we need to write to the file when shadowing and it's best to do here, since it's the only way to be sure that the initialization was successful.
        }
      });
    });
  }
}

function processExitError(code, signal, pid) {
  if(code == 0) {
    console.log(`Requirements process ${pid} exited with code: ${code} and signal ${signal}`);
  }
  if(code == 1) {
    console.log(`Requirements process ${pid} crashed with code ${code}`);
  }
  if(signal == "SIGTERM") {
    console.log(`Requirements process ${pid} was stopped with signal ${signal}`);
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