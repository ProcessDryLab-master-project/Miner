import fs from "fs";
import path from "path";
import {
  getBodyAllMetadata,
  getMetadataFileExtension,
  getMetadataResourceType,
} from "./BodyUnpacker.js";
import {
  getMinerResourceInput,
  
} from "./ConfigUnpacker.js";

var delInterval = setInterval(removeFile, 1000);

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

export function validateInput(body, minerConfig){
  const expInputs = getMinerResourceInput(minerConfig);
  const actInputs = getBodyAllMetadata(body);

  for(var key in expInputs){
    let expInput = expInputs[key];
    let actInput = actInputs[expInput.Name];
    console.log("expInput:");
    console.log(expInput);
    console.log("actInput:");
    console.log(actInput);
    const incorrectType = getMetadataResourceType(actInput) != expInput.ResourceType;
    const incorrectExtension = getMetadataFileExtension(actInput) != expInput.FileExtension;
    console.log(`Expected resource type: ${expInput.ResourceType}, actual resource type: ${getMetadataResourceType(actInput)}. They don't match ${incorrectType}`);
    console.log(`Expected resource extension: ${expInput.FileExtension}, actual resource extension: ${getMetadataFileExtension(actInput)}. They don't match ${incorrectExtension}`);
    if(!actInput) {
      console.log(`Unable to find input resource for key: ${expInput.Name}`);
      return `Unable to find input resource for key: ${expInput.Name}`;
    }
    if(incorrectType) {
      let errMsg = `Input resource type for key ${expInput.Name} does not match the expected resource type: ${getMetadataResourceType(actInput)}`;
      console.log(errMsg)
      return errMsg;
    }
    if(incorrectExtension) {
      let errMsg = `Input resource extension for key ${expInput.Name} does not match the expected file extension: ${getMetadataFileExtension(actInput)}`;
      console.log(errMsg)
      return errMsg;
    }
  }
}

export function removeFile(filePath) {
  if (fs.existsSync(filePath)) {
    fs.open(filePath, "r+", function (err, fd) {
      if (err && err.code === "EBUSY") {
        //do nothing till next loop
      } else if (err && err.code === "ENOENT") {
        console.log(filePath, "deleted");
        clearInterval(delInterval);
      } else {
        fs.close(fd, function () {
          fs.unlink(filePath, function (err) {
            if (err) {
            } else {
              console.log(filePath, "deleted");
              clearInterval(delInterval);
            }
          });
        });
      }
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
  }
}

export function isObjEmpty (obj) {
  return Object.keys(obj).length === 0;
}

export function appendUrl(urls = []){
  let concatPath = "";
  urls.forEach(url => {
    // TODO: if url is undefined, break and handle it.
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
