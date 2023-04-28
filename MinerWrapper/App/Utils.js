import fs from "fs";
import path from "path";
import os from "os";

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

// export function startVitualEnvironmentString() {
//   switch(os.type()) {
//     case "Windows_NT":
//       return {
//         command: "Scripts\\activate.bat",
//         args: ""
//       };
//     case "Linux":
//       return {
//         command: "source env/bin/activate", // Don't know if child_process wants source as a command and the rest as args. If it doesn't work, try splitting it up.
//         args: ""
//       };
//     default:
//       throw new Error("Unsupported OS");
//   }
// }

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

export function stopVirtualEnvironment() {
  return {
    command: "deactivate",
    args: ""
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