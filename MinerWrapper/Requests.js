import fetch from "node-fetch";
import https from "https";
import fs from "fs";
import FormData from "form-data";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export const getResourceFromRepo = async (url, filePath) => {
  const res = await fetch(url, { agent });
  const fileStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
  console.log(`Log saved to ${filePath}`);
};

export const sendResourceToRepo = async (repositoryPath, minerResult, incomingFileId, resourceType) => {
  const filePath = minerResult;
  const nameWithoutExtension = filePath.split("\\").pop().split("/").pop().split(".").pop(); // Removes path and extension from filePath to get file name.
  const fileExtension = filePath.split(".").pop();
  const formdata = new FormData();
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(filePath);
  formdata.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  formdata.append("ResourceLabel", nameWithoutExtension);
  formdata.append("ResourceType", resourceType);
  formdata.append("FileExtension", fileExtension);
  formdata.append("Parents", incomingFileId);
  var requestOptions = {
    agent: agent,
    method: "POST",
    body: formdata,
    redirect: "follow",
  };
  let fetchData = await fetch(repositoryPath, requestOptions);
  let response = await fetchData.json();
  return response;
};

export const initiateResourceOnRepo = async (
  repositoryPath,
  resourceLabel,
  resourceType,
  fileExtension
) => {
  let tmpPath = await createTmpFile(fileExtension);
  const formdata = new FormData();
  const stats = fs.statSync(tmpPath);
  const fileSizeInBytes = stats.size;
  const readStream = fs.createReadStream(tmpPath);
  formdata.append("field-name", readStream, { knownLength: fileSizeInBytes });
  formdata.append("resourceLabel", resourceLabel);
  formdata.append("resourceType", resourceType);
  formdata.append("fileExtension", fileExtension);
  var requestOptions = {
    agent: agent,
    method: "POST",
    body: formdata,
    redirect: "follow",
  };
  let fetchData = await fetch(repositoryPath, requestOptions);
  let response = await fetchData.json();
  console.log("rep resp: " + response);
  return response;
};

async function createTmpFile(extension) {
  let tmpPath = `./Downloads/tmp.${extension}`;
  let result = {};
  let output = JSON.stringify(result);
  try {
    let x = await fs.promises.writeFile(tmpPath, output, "utf8", (err) =>
      console.log(err)
    );
    return tmpPath;
  } catch (err) {
    console.error("Error occurred while reading directory!", err);
  }
}
