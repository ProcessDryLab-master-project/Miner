import fetch from "node-fetch";
import https from "https";
import fs from "fs";
import FormData from "form-data";

const agent = new https.Agent({
  rejectUnauthorized: false,
});

export function getResource(destination, resourceType, resourceName) {
  const data = {
    resourceType: resourceType,
    resourceName: resourceName,
  };

  fetch(destination, {
    method: "GET", // or 'PUT'
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((data) => {
      return data;
    })
    .catch((error) => {
      console.error("Error:", error);
    });
}

export const downloadFile = async (url, filePath) => {
  // let filePath = './Uploads';
  const res = await fetch(url, { agent });
  const fileStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    res.body.pipe(fileStream);
    res.body.on("error", reject);
    fileStream.on("finish", resolve);
  });
};

export const sendFile = async (url, result) => {
  var formdata = {
    name: "fileFromMiner.pnml",
    file: {
      value: fs.createReadStream("./PythonMiner/running-example.pnml"),
      options: {
        filename: "fileFromMiner.pnml",
        // contentType: "multipart/form-data",
      },
    },
  };

  var requestOptions = {
    agent: agent,
    method: "POST",
    // headers: {
    //   "Content-Type": "multipart/form-data",
    // },
    body: formdata,
    redirect: "follow",
  };

  fetch(url, requestOptions)
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.log("error", error));
};

export const sendResource = async (url, result) => {
  const response = await fetch(url, {
    agent: agent,
    method: "POST",
    headers: {
      "Content-Type": "text/xml",
    },
    body: result,
  })
    .then((response) => {
      console.log("Response status: " + response.status);
      return response.text();
    })
    .then((responseText) => {
      console.log("Response text: " + responseText);
    })
    .catch((error) => {
      console.log("Error caught: " + error);
    });
  return response;
};
