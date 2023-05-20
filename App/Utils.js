import fs from "fs";
import path from "path";
import spawn from "child_process";
import crypto from "crypto";
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
} from "./OSHelper.js";

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
  if(fs.existsSync(filePath)) {
    // console.log("Removing: " + filePath);  
    fs.unlink(filePath, (err) => {
      if (err) {
        throw err;
      }
      // console.log("Delete File successfully.");
    });
  }
}
export function removeFolder(folderPath) {
  if(fs.existsSync(folderPath)) {
    console.log("Removing: " + folderPath);

    fs.rmSync(folderPath, { recursive: true, force: true }, (err) => {
      if (err) {
        return console.log("error occurred in deleting directory contents", err);
      }
    });
    // fs.rmdir(folderPath, { recursive: true, force: true });

    // fs.rmSync(folderPath, { recursive: true, force: true }, (err) => {
    //   if (err) {
    //     return console.log("error occurred in deleting directory", err);
    //   }
    //   console.log("Directory deleted successfully");
    // });

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

export function streamToString (stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  })
}
// Use like this:
// streamToString(data._streams[1])
// .then(res => {
//     console.log(res);
// });
