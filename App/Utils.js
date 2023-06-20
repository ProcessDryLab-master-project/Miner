import fs from "fs";
import path from "path";

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
