import fs from "fs";
import path from "path";
import spawn from "child_process";
import { fileURLToPath } from 'url';
import {
  writeConfig,
  getConfig,
  getMinerPath,
  getMinerFile,
} from "./ConfigUnpacker.js";
import {
  python,
  pip,
  pythonVenvPath,
  pipVenvPath,
} from "./DockerHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export function appendUrl(urls = []){
  let concatPath = "";
  urls.forEach(url => {
    concatPath = path.join(concatPath, url.toString());
  });
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


export function initAllVenv(configList) {
  console.log("__filename: " + __filename);
  console.log("__dirname: " + __dirname);
  const tmpConfigList = getConfig();
  tmpConfigList.forEach(config => {
    initSingleVenv(config, configList);
  });
}

export async function initSingleVenv(config, configList, write) {
  const venvName = "env";
  const minerPath = getMinerPath(config);
  const venvPath = path.join(minerPath, venvName);
  const pyPath = path.join(minerPath, pythonVenvPath());
  const pipPath = path.join(minerPath, pipVenvPath());
  const requirementsPath = path.join(minerPath, "requirements.txt");
  const minerFile = getMinerFile(config);
  const minerExtension = minerFile.split('.').pop();

  if (minerExtension == "py" && !getDirectories(minerPath).includes(venvName)) {
    // console.log(`Create venv for ${minerFile}, removing ${config.MinerId} from configList until done`);
    removeObjectWithId(configList, config.MinerId);

    // cmd(python(), "-m", "venv", venvPath)
    // .then(venvRes => {
    //   if(processExitError(venvRes.code, venvRes.signal, venvRes.pid, minerFile, "venv")) return;
    //   console.log(`Upgrade pip in venv for ${minerFile}`);
    //   cmd(pyPath, "-m", "pip", "install", "--upgrade", "pip") // May not need this subprocess. It's just to ensure newest version of pip.
    //   .then(pipRes => {
    //     if(processExitError(pipRes.code, pipRes.signal, pipRes.pid, minerFile, "pip")) return;
    //     console.log(`Install wheel before requirements for ${minerFile}`);
    //     cmd(pipPath, "install", "wheel")
    //     .then(wheelRes => {
    //       if(processExitError(wheelRes.code, wheelRes.signal, wheelRes.pid, minerFile, "wheel")) return;
    //       console.log(`Install requirements in venv for ${minerFile}`);
    //       cmd(pipPath, "install", "--no-cache-dir", "-r", requirementsPath)
    //       .then(reqRes => {
    //         if(processExitError(reqRes.code, reqRes.signal, reqRes.pid, minerFile, "requirements")) return;
    //         configList.push(config);
    //         if(write) writeConfig(configList); // Only write to config if shadow.
    //         console.log(`Setup for ${minerFile} is complete.`);
    //       });
    //     });
    //   });
    // });

    // Cleaner version of the sequence of commands above, however, with less prints.
    console.info(`Create venv for ${minerFile}`);
    await cmd(python(), "-m", "venv", venvPath).then(res => {
      if(processExitError(res.code, res.signal, res.pid, minerFile, "venv")) return;
    });

    console.info(`Upgrade pip in venv for ${minerFile}`);
    await cmd(pyPath, "-m", "pip", "install", "--upgrade", "pip").then(res => {
      if(processExitError(res.code, res.signal, res.pid, minerFile, "pip")) return;
    });

    console.info(`Install wheel before requirements for ${minerFile}`);
    await cmd(pipPath, "install", "wheel").then(res => {
      if(processExitError(res.code, res.signal, res.pid, minerFile, "wheel")) return;
    });

    console.info(`Install requirements in venv for ${minerFile}`);
    await cmd(pipPath, "install", "--no-cache-dir", "-r", requirementsPath).then(res => {
      if(processExitError(res.code, res.signal, res.pid, minerFile, "requirements")) return;
    });

    configList.push(config);
    if(write) writeConfig(configList);

    console.info(`Setup for ${minerFile} is complete.`);
  }
}

async function cmd(...command) {
  let p = spawn.spawn(command[0], command.slice(1));
  return new Promise((resolveFunc) => {
    // This will print a lot. May be useful but has been commented to avoid spam.
    // p.stdout.on("data", (x) => {
    //   process.stdout.write("stdout: " + x.toString());
    // });
    p.stderr.on("data", (x) => {
      process.stderr.write("stderr: " + x.toString());
    });
    p.on("exit", (code, signal) => {
      let resolveObj = {
        code: code,
        signal: signal,
        pid: p.pid,
      };
      resolveFunc(resolveObj);
    });
  });
}

function processExitError(code, signal, pid, minerFile, processType) {
  if(code == 0) {
    console.info(`Successfully finished \"${processType}\" process with id \"${pid}\" for \"${minerFile}\".`);
    return false;
  }
  if(code == 1) {
    console.error(`${processType} process ${pid} crashed with code ${code}`);
  }
  if(signal == "SIGTERM") {
    console.error(`${processType} process ${pid} was stopped with signal ${signal}`);
  }
  if(code != 1 && code != 0 && signal != "SIGTERM"){
    console.error(`${processType} process ${pid} exited with code: ${code} and signal ${signal}`);
  }
  return true;
}