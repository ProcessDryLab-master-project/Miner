import fetch from 'node-fetch';
import https from 'https';
import fs from 'fs';
const agent = new https.Agent({
    rejectUnauthorized: false
  });

export function getResource(destination, resourceType, resourceName){
    const data = {
        resourceType: resourceType,
        resourceName: resourceName
    };

    fetch(destination, {
        method: 'GET', // or 'PUT'
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((data) => {
        return data;
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}

export const downloadFile = (async (url, filePath) => {
    // let filePath = './Uploads';
    const res = await fetch(url, {agent});
    const fileStream = fs.createWriteStream(filePath);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
      });
  });