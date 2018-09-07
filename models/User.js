'use strict'

var mongoose = require ('mongoose');
var db = require('../db_config');
var bcrypt = require("bcrypt");
var SALT_WORK_FACTOR = 10;
// var Promise = require("bluebird");

// const bcrypt = Promise.promisifyAll(require("bcrypt"));


var User_profile = new mongoose.Schema({
	
	email_id			: {type: String, unique: true, lowercase: true},
	username			: {type: String, unique: true, required: true},
	//mobile_number		: {type: Number, index: true},
	password			: {type: String, required: true},
	area_of_interest 	: {type: Array, required: false},
	//area_of_interest 	: {type: , required: false},
	area_of_expertise	: {type: Array, required: false}
},{ collection : "user" });

 
// User_profile.pre("save", async function (next) {
//     if (!this.isModified("password")) {
//         return next();
//     }
 
//     try {
//         const hash = await bcrypt.hashAsync(this.password, 7);
 
//         this.password = hash;
//         next();
 
//     } catch (err) {
//         next(err);
//     }
// });

User_profile.pre('save', function(next)
{
	var user = this;
	if (!user.isModified('password'))
		return next();

	// generate a salt
	bcrypt.genSalt(SALT_WORK_FACTOR, function(err, salt)
	{
    	if (err)
    		return next(err);

    	// hash the password along with our new salt
    	bcrypt.hash(user.password, salt, function(err, hash)
    	{
        	if (err)
        		return next(err);

	        // override the cleartext password with the hashed one
	        user.password = hash;
	        next();
    	});
    });
});

User_profile.methods.comparePassword = function(candidatePassword, cb)
{
	console.log('compare time start : ' + new Date().getMilliseconds());
    bcrypt.compare(candidatePassword, this.password, function(err, isMatch)
    {
        if (err)
        	return cb(err);
        console.log('compare end start : ' + new Date().getMilliseconds());
        cb(null, isMatch);
    });
};

module.exports = db.model('user', User_profile);