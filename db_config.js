var express = require('express');
var mongoose = require('mongoose');

//Connection with the Database
var connection = mongoose.createConnection("mongodb://localhost/peer_to_peer");

//Listener for the connection
connection.on('error', function (err)
{	
	console.log('Mongoose connection error: ' + err);
});

// If the Node process ends, close the Mongoose connection
process.on('SIGINT', function()
{
	connection.close(function ()
	{
    	console.log('User management disconnected from database on app termination');
    	process.exit(0);
	});
});

module.exports = connection;