import fetch from "node-fetch";
import https from "https";
import fs from "fs";
import FormData from "form-data";
import os from "os";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export const getResourceFromRepo = async (url, filePath) => {
  let result = fetch(url, { agent })
  .then(
    res =>
      new Promise((resolve, reject) => {
        const fileWriteStream = fs.createWriteStream(filePath);
        res.body.pipe(fileWriteStream);
        res.body.on("end", () => resolve("File saved"));
        fileWriteStream.on("error", reject);
      })
  )
  .then(success => success)
  .catch(error => error);
  return result;
}

export const updateMetadata = async (url, overwriteId, isDynamic) => {
  const fileURL = new URL(overwriteId, "https://localhost:4000/resources/metadata/").toString()
  const data = new FormData();
  data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
  var requestOptions = {
    agent: agent,
    method: "PUT",
    body: data,
    redirect: "follow",
  };
  // let responseData = fetch(fileURL, requestOptions)
  // .then(res => {

  // });
  let responseData = await fetch(fileURL, requestOptions);
  let response = await responseData.json();
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
}

export const sendResourceToRepo = async (output, parents, generatedFrom, minerResult, resourceOutputExtension, resourceOutputType, overwriteId, isDynamic) => {
  let description = `Miner result from some miner`;

  const stats = fs.statSync(minerResult);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(minerResult);

  parents = JSON.stringify(parents);
  generatedFrom = JSON.stringify(generatedFrom);

  const data = new FormData();
  data.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  data.append("ResourceLabel", output.ResourceLabel);
  data.append("ResourceType", resourceOutputType);
  data.append("FileExtension", resourceOutputExtension);
  data.append("Description", description);
  data.append("GeneratedFrom", generatedFrom);
  data.append("Parents", parents);
  if(overwriteId != undefined) data.append("OverwriteId", overwriteId);
  if(isDynamic) data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
  var requestOptions = {
    agent: agent,
    method: "POST",
    body: data,
    redirect: "follow",
  };
  let responseData = await fetch(output.Host, requestOptions);
  let response = await responseData.json();
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
};
