'use strict'

var express = require('express');
var bodyParser = require('body-parser');
var expressValidator = require('express-validator');
var app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(expressValidator());

//CORS 
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

//API routing
app.use('/api', require('./routes/user'));
app.use('/ask', require('./routes/question'));

// server running
var PORT = 7777;
app.listen(PORT);
console.log('Peer to Peer learning app listening on port : ' + PORT);