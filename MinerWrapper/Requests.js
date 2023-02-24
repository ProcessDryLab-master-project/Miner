import fetch from 'node-fetch';
// import fs from 'fs';

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