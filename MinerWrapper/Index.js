// const express = require('express');
import express from 'express';
const app = express()
import Endpoints from './Endpoints.js';

function startEndPoints(){
    Endpoints(app);
}
startEndPoints();
