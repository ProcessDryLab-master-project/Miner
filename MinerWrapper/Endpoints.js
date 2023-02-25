import Wrapper from './Wrapper.js';
const port = 5000;
const configPath = '../config.json';
import fs from 'fs';
import {getResource, downloadFile} from './Requests.js';

export default function initEndpoints(app){

    app.get('/', function(req, res){
        res.send('Default page');
    });

    app.get('/Ping', function(req, res){
        res.send('Pong');
    });

    app.get('/configurations', function(req, res){
        console.log("Getting a request on /configurations");
        const file = fs.readFileSync(configPath);
        const json = JSON.parse(file);
        res.send(json);
    });

    app.post('/miner', function(req, res){ // needs testing to confirm if it works.
        let body = req.body;
        console.log("Body: " + body);
        let resourceURL = body.resource;
        console.log("URL: " + resourceURL);
        
        let filePath = './Downloads/running-example.xes';
        downloadFile(resourceURL, filePath);
        let result = Wrapper(filePath);
        res.send(result);
    });

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}