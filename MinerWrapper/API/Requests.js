import fetch, { FetchError } from "node-fetch";
import https from "https";
import http from "http";
import fs from "fs";
import FormData from "form-data";
import os from "os";
import path from "path";
import crypto from "crypto";
import {
  getBodyInput,
  getAllMetadata,
  getSingleMetadata,
  getBodyOutput,
  getBodyOutputHost,
  getBodyOutputHostInit,
  getBodyOutputLabel,
  getBodyOutputOverwrite,
  getBodyMinerId,
  hasStreamInput,
  metadataIsStream,
  getMetadataResourceId,
  getMetadataResourceInfo,
  getMetadataResourceType,
  getMetadataFileExtension,
  getMetadataHost,
  getBodyOutputTopic,
} from "../App/BodyUnpacker.js";
import {
  getMinerResourceOutput,
  getMinerId,
  getMinerLabel,
  getMinerResourceOutputType,
  getMinerResourceOutputExtension,
  getMinerPath,
  getMinerFile,
  getMinerResourceInput,
  getMinerResourceInputKeys,
} from "../App/ConfigUnpacker.js";
import {
  removeFile,
  isObjEmpty,
  appendUrl,
} from "../App/Utils.js";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
const httpAgent = new http.Agent({
  rejectUnauthorized: false,
});

export const getForeignMiner = async (body, config) => {
  let shadowConfig = body.Config;
  let shadowExtension = getMinerFile(shadowConfig).split('.').pop();
  const shadowUrl = appendUrl(body.Host, getMinerId(shadowConfig)).toString();
  let requirementsUrl = appendUrl(body.Host, "requirements");
  requirementsUrl = appendUrl(requirementsUrl, getMinerId(shadowConfig)).toString();

  if(config.find(miner => miner.MinerId == getMinerId(shadowConfig))) {
    shadowConfig.MinerId = crypto.randomUUID(); // If a miner already exists with the original ID, we need to create a new one.
  }
  
  let shadowFileName = `Shadow-${getMinerId(shadowConfig)}`;
  let shadowNameWithExt = `${shadowFileName}.${shadowExtension}`;
  // const shadowFolderPath = path.join("./Miners", shadowFileName); // TODO: Should "Miners" just be hardcoded in here? 
  const shadowFolderPath = `.\\Miners\\${shadowFileName}`; // TODO: Should "Miners" just be hardcoded in here? 
  const shadowFilePath = path.join(shadowFolderPath, shadowNameWithExt);
  shadowConfig.MinerPath = shadowFolderPath;
  shadowConfig.MinerFile = shadowNameWithExt;

  console.log("Requesting shadow from: " + shadowUrl);
  let result = await fetch(shadowUrl, { agent: httpAgent })
  .then(res => {
    return new Promise((resolve, reject) => {
      if(!res.ok) {
        reject(res.text().then(text => { throw new Error(text)}));
      }
      else {
        fs.mkdir(shadowFolderPath, { recursive: true }, (err) => {
          if (err) reject(err.text().then(text => {throw new Error(text)}));
        });
        const fileWriteStream = fs.createWriteStream(shadowFilePath);
        console.log("Saving shadow to: " + shadowFilePath);
        res.body.pipe(fileWriteStream);
        config.push(shadowConfig); // TODO: Consider if config should just be updated in here only, not in "Endpoints". Since it's a var, it seems to be updated everywhere from this line anyway.
        res.body.on("end", () => resolve(config));  // Will return config so the var is overwritten when used next.
        fileWriteStream.on("error", reject);
      }
    })
  })
  .catch(error => {
    console.log("CATCH: fetch error: ");
    console.log(error);
    return error;
  });

  // TODO: We need to get requirements.txt and place it in the correct folder
  // if(shadowExtension != "py"){
  //   return new Promise(resolve => {
  //     resolve("No requirements needed");
  //   })
  // }

  // const requirementsPath = path.join(shadowFolderPath, "requirements.txt");
  // let requirementsResult = await fetch(requirementsUrl, { agent: httpAgent })
  // .then(res => {
  //   return new Promise((resolve, reject) => {
  //     if(!res.ok) {
  //       reject(res.text().then(text => { throw new Error(text)}));
  //     }
  //     else {
  //       const fileWriteStream = fs.createWriteStream(requirementsPath);
  //       console.log("Saving shadow to: " + requirementsPath);
  //       res.body.pipe(fileWriteStream);
  //       config.push(shadowConfig); // TODO: Consider if config should just be updated in here only, not in "Endpoints". Since it's a var, it seems to be updated everywhere from this line anyway.
  //       res.body.on("end", () => resolve(config));  // Will return config so the var is overwritten when used next.
  //       fileWriteStream.on("error", reject);
  //     }
  //   })
  // })
  // .catch(error => {
  //   console.log("CATCH: fetch error: ");
  //   console.log(error);
  //   return error;
  // });
  


  return result; // Returns result, which is the promise with "config"
}

export const getForeignMinerRequirements = async (body) => {
  let shadowConfig = body.Config;
  let shadowExtension = getMinerPath(shadowConfig).split('.').pop();
  if(shadowExtension != "py"){
    return new Promise(resolve => {
      resolve("No requirements needed");
    })
  }
  
  const shadowUrl = appendUrl(body.Host, getMinerId(shadowConfig));
  shadowUrl = appendUrl(shadowUrl, "requirements").toString(); // TODO: Consider if "requirements" should be part of the request body.
  
  let shadowFileName = `Shadow-${getMinerId(shadowConfig)}`;
  const shadowFolderPath = path.join("./Miners", shadowFileName); // TODO: Should "Miners" just be hardcoded in here? 
  const shadowFilePath = path.join(shadowFolderPath, `${shadowFileName}.${shadowExtension}`);

  console.log("Requesting shadow from: " + shadowUrl);
  let result = await fetch(shadowUrl, { agent: httpAgent })
  .then(res => {
    return new Promise((resolve, reject) => {
      if(!res.ok) {
        reject(res.text().then(text => { throw new Error(text)}));
      }
      else {
        const fileWriteStream = fs.createWriteStream(shadowFilePath);
        console.log("Saving shadow to: " + shadowFilePath);
        res.body.pipe(fileWriteStream);
        config.push(shadowConfig); // TODO: Consider if config should just be updated in here only, not in "Endpoints". Since it's a var, it seems to be updated everywhere from this line anyway.
        res.body.on("end", () => resolve(config));  // Will return config so the var is overwritten when used next.
        fileWriteStream.on("error", reject);
      }
    })
  })
  .catch(error => {
    console.log("CATCH: fetch error: ");
    console.log(error);
    return error;
  });
  return result; // Returns result, which is the promise with "config"
}

export const getResourceFromRepo = async (url, filePath) => {
  var requestOptions = {
    agent: httpsAgent,
    method: "GET",
    redirect: "follow",
  };

  let responseObj = {};
  let result = fetch(url, requestOptions)
  .then(response => {
    if(!response.ok) {
      return response.text();
    }
    return new Promise((resolve, reject) => {
      const fileWriteStream = fs.createWriteStream(filePath);
      response.body.pipe(fileWriteStream);
      response.body.on("end", () => {
        resolve("File saved");
      });
      fileWriteStream.on("error", () => {
        reject("Exception when writing downloaded file to Tmp folder.");
      });
    });
  })
  .then(result => {
    responseObj.response = result;
    responseObj.status = (result == "File saved"); // True if promise resolved, false if not.
    return responseObj;
  })
  .catch(error => {
      responseObj.response = error;
      responseObj.status = false;
    return responseObj;
  });
  return result;
}

export const updateMetadata = async (body, resourceId, isDynamic) => {
  const repoUrl = appendUrl(getBodyOutputHostInit(body), resourceId).toString();
  console.log(`Updating metadata on url: ${repoUrl} to set Dynamic to: ${isDynamic}`);
  const data = new FormData();
  data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
  var requestOptions = {
    agent: httpsAgent,
    method: "PUT",
    body: data,
    redirect: "follow",
  };
  let responseData = await fetch(repoUrl, requestOptions)
  .then((success) => {
    // console.log(success);
    return success;
  })
  .catch((error) => {
    console.log(error);
    return error;
  });
  return responseData;
  // let response = await responseData.json();
  // let responseObj = {
  //   response: response,
  //   status: responseData.ok,
  // }
  // return responseObj;
};

export const sendMetadata = async (body, minerToRun, ownUrl, parents) => {
  let generatedFrom = {
    SourceHost: ownUrl,
    SourceId: getMinerId(minerToRun),
    SourceLabel: getMinerLabel(minerToRun),
  }

  console.log("Trying to send metadata");

  let description = `Filtered stream`;

  parents = JSON.stringify(parents);
  generatedFrom = JSON.stringify(generatedFrom);

  const data = new FormData();
  data.append("Host", getBodyOutputHost(body));                         // mqtt.eclipseprojects.io
  data.append("StreamTopic", getBodyOutputTopic(body));                 // FilteredAlphabetStream 
  data.append("Overwrite", getBodyOutputOverwrite(body).toString());    // true/false 
  data.append("ResourceLabel", getBodyOutputLabel(body));               // Filtered Alphabet Stream
  data.append("ResourceType", getMinerResourceOutputType(minerToRun));  // EventStream
  data.append("Description", description);
  data.append("GeneratedFrom", generatedFrom);
  data.append("Parents", parents);
  var requestOptions = {
    agent: httpsAgent,
    method: "POST",
    body: data,
    redirect: "follow",
  };
  
  let responseData = await fetch(getBodyOutputHostInit(body), requestOptions);
  let response = await responseData.json();
  console.log("Response: ", response);
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
};

export const updateResourceOnRepo = async (body, minerResult, resourceId) => {
  const stats = fs.statSync(minerResult);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(minerResult);

  if(fileSizeInBytes == 0) { // TODO: This may be an error, printing to identify it. Remove when problem is identified.
    console.log("fileSizeInBytes: " + fileSizeInBytes); 
    console.log("minerResult: " + minerResult);
    console.log("file exists: " + fs.existsSync(minerResult));
    fileStream.on('data', function (chunk) {
      console.log("file content: " + chunk.toString());
    });
  } 

  const data = new FormData();
  data.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  var requestOptions = {
    agent: httpsAgent,
    method: "PUT",
    body: data,
    redirect: "follow",
  };
  
  const outputUrl = appendUrl(getBodyOutputHost(body), resourceId).toString();
  // console.log("outputUrl: " + outputUrl);
  // return await fetch(outputUrl, requestOptions)
  // .then(res => {
  //   return res
  // })
  // .catch(error => console.log(error));
  let responseData = await fetch(outputUrl, requestOptions);
  let response = await responseData.json();
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
};


export const sendResourceToRepo = async (body, minerToRun, ownUrl, parents, minerResult) => {
  let isDynamic = hasStreamInput(body);
  let generatedFrom = {
    SourceHost: ownUrl,
    SourceId: getMinerId(minerToRun),
    SourceLabel: getMinerLabel(minerToRun),
  }

  let description = `Miner result from some miner`;
  const stats = fs.statSync(minerResult);
  const fileSizeInBytes = stats.size;
  const fileStream = fs.createReadStream(minerResult);

  parents = JSON.stringify(parents);
  generatedFrom = JSON.stringify(generatedFrom);

  const data = new FormData();
  data.append("field-name", fileStream, { knownLength: fileSizeInBytes });
  data.append("ResourceLabel", getBodyOutputLabel(body));
  data.append("ResourceType", getMinerResourceOutputType(minerToRun));
  data.append("FileExtension", getMinerResourceOutputExtension(minerToRun));
  data.append("Description", description);
  data.append("GeneratedFrom", generatedFrom);
  data.append("Parents", parents);
  if(isDynamic) data.append("Dynamic", isDynamic.toString());  // If it's a stream miner, it should be marked as dynamic
  var requestOptions = {
    agent: httpsAgent,
    method: "POST",
    body: data,
    redirect: "follow",
  };
  
  let responseData = await fetch(getBodyOutputHost(body), requestOptions);
  let response = await responseData.json();
  let responseObj = {
    response: response,
    status: responseData.ok,
  }
  return responseObj;
};
