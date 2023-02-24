
import Wrapper from './Wrapper.js';
// import fetch from 'node-fetch';
const port = 5000;
const configPath = '../config.json';
import fs from 'fs';
import {getResource} from './Requests.js';

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

    app.post('/Miner', function(req, res){ // needs testing to confirm if it works.
        const file = fs.readFileSync(configPath);
        const json = JSON.parse(file);
        const params = json.params;
        const result = Wrapper(params);

        //Remove linecomment when connecting with repository
        //const resource = getResource(req.path, req.type, req.name); 

        res.send(result);
    });

    app.listen(port, () => {
        console.log(`Example app listening on port ${port}`)
    })
}