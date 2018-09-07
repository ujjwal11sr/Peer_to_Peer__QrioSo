'use strict'

var mongoose = require ('mongoose');
var db = require('../db_config');
// var bcrypt = require('bcrypt-nodejs');
// mongoose.Promise = global.Promise;

var User_profile = new mongoose.Schema({
	
	// email_id			: {type: String, unique: true, lowercase: true},
	name				: {type: String, required: true},
	//mobile_number		: {type: Number, index: true},
	password			: {type: String, required: true},
	// Area_of_interest 	: {type: Array, required: true},
	// Area_of_expertise	: {type: Array, required: true}
},{ collection : "user" });

// generating a hash
// User_profile.methods.generateHash = function (password)
// {
// 	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
// };

// // checking if password is valid
// User_profile.methods.validPassword = function(password)
// {
// 	return bcrypt.compareSync(password, this.password);
// };


module.exports = db.model('user', User_profile);