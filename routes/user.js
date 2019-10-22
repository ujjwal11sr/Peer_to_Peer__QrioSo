'use strict'
var express = require('express');
var waterfall = require('async/waterfall');
var aj = require('aj');
var bcrypt = require("bcrypt");


var User_profile = require('../models/User');

var router = express.Router();

//API for user registration
router.post('/register', function(req, res)
{
	var start_time = new Date();
	console.log('Post request on register API');
	waterfall([
		validate_body,
		register_user
		], function(error, message)
		{
			if (error)
			{
				switch (message)
				{
					case 'REQUEST_BODY_VALIDATION_ERROR':
						res.send({status: 'ERROR', msg: 'Invalid Email-id.'});
						return;

        			case 'DUPLICATE_KEY_ERROR':
						res.send({status: 'ERROR', msg: 'User already exists.'});
						return;
                    
					default:
						res.send({status: 'ERROR', msg: 'Server Error while registration.'});
						return;
				}
			}
			res.send({status: 'SUCCEESS',  msg: 'Succesfully Registered'});
			return;
	});

	function validate_body(callback)
	{
		console.log(JSON.stringify(req.body));
		req.checkBody('name', 'Name is required').notEmpty();
		req.checkBody('email_id', 'Email is required').notEmpty().isEmail();
		req.checkBody('password', 'password is required').notEmpty();

		var errors = req.validationErrors();
		
		if (errors)
		{
			console.log('Vlidation error ' + JSON.stringify(errors));
			callback(errors, 'REQUEST_BODY_VALIDATION_ERROR');
			return;
		} else {
			callback(null);
		}
		// req.getValidationResult().then(function (result) {
		// 	if (!result.isEmpty())
		// 	{
		// 		callback(result, 'REQUEST_BODY_VALIDATION_ERROR');
		// 		console.log(result);
		// 		return;
		// 	}
		// 	else
		// 		callback(null);
		// });
	}

	function register_user(callback)
	{
		var new_user = new User_profile({
			username : req.body.name,
			email_id : req.body.email_id,
			password : req.body.password
		});
		
		new_user.save(function(err, user)
		{
			if (err && err.name === 'MongoError' && err.code == 11000)
			{
				console.log('user already exists ' + err);
				callback(err, 'DUPLICATE_KEY_ERROR');
				return;
			}
			if (err)
			{
				console.log('INTERNAL_DB_ERROR in registering new user ' + err);
				callback(err, 'INTERNAL_DB_ERROR');
        		return;
			}
			callback(null);
      		return;
		});
	}
});


// API for user login authentication
router.post('/login', function(req, res)
{
	waterfall([
		validate_body,
		find_user
		// authenticate_user
	], function(error, message)
	{
		if (error)
		{
			switch (message)
			{
				case 'REQUEST_BODY_VALIDATION_ERROR':
					res.send({status: 'ERROR', msg: 'Invalid Email-id'});
					// res.send({status: 'ERROR'});
					return;

    			case 'USER_NOT_FOUNND':
					res.send({status: 'ERROR', msg: 'User not found, Please register.'});
					return;
                
                case 'INVALID_USER':
                	res.send({status: 'ERROR', msg: 'Invalid login credentials.'}); 	
                	// res.status(500).send({status: 'ERROR'});
					return;
				default:
					res.send({status: 'ERROR', msg: 'Server Error while login. Please try again...'});
					return;
			}
		}
		res.send({status: 'SUCCESS',  msg: 'Succesfully logged in'});
		return;
	});

	function validate_body (callback)
	{
		console.log(req.body);
		req.checkBody('email_id', 'Email is required').notEmpty().isEmail();
		req.checkBody('password', 'password is required').notEmpty();
		var errors = req.validationErrors();
		
		if (errors)
		{
			console.log('Vlidation error ' + JSON.stringify(errors));
			callback(errors, 'REQUEST_BODY_VALIDATION_ERROR');
			return;
		} else {
			callback(null);
		}
	}

	function find_user (callback)
	{
		User_profile.findOne({email_id: req.body.email_id},{_id:0, password:1} , function(err, data)
		{
			if (err)
			{
				console.log('INTERNAL_DB_ERROR in finding user with email_id: ' + req.body.email_id);
				callback(error, 'INTERNAL_DB_ERROR');
				return;
			}
			if (!data)
			{
				console.log('USER_NOT_FOUNND with email_id: ' + req.body.email_id);
				callback('ERROR', 'USER_NOT_FOUNND');
				return;
			}
			console.log(data);
			// db_password = data.password;
			data.comparePassword (req.body.password, function (error, isMatch)
			{
				if (error)
				{
					console.log('INTERNAL_DB_ERROR in finding user with email_id: ' + req.body.email_id);
					callback(error, 'INTERNAL_DB_ERROR');
					return;
				}
				if (isMatch === false)
				{
					console.log('INVALID_USER');
					callback('error', 'INVALID_USER');
					return;
				}
				console.log('Succesfully login');
				callback(null);
				return;
			});
		});
	}

	//not in use
	function authenticate_user (callback)
	{
		var check_time = new Date();
		console.log("check_start : " + new Date());
		bcrypt.compareSync (req.body.password, db_password, function(err, result)
		{
			if(err)
			{
				console.log('error in comparing password  ' + err);
				callback('error', 'INTERNAL_DB_ERROR');
				return;
			}
			if (result === false)
			{
				console.log('INVALID_USER');
				callback('error', 'INVALID_USER');
				return;
			}
			
			callback(null);
			return;
		});
	}
});


//API for updating the area of interest .
router.post('/area-interest', function(req, res)
{
	console.log('Post request on area of interest API');
	waterfall([
		validate_body,
		Update_area
	], function(error, message)
	{
		if (error)
		{
			switch (message)
			{
				case 'REQUEST_BODY_VALIDATION_ERROR':
					res.status(400).send({status: 'ERROR', msg: 'Validation error in area-interest.'});
					return;

    			case 'USER_NOT_FOUNND':
					res.status(400).send({status: 'ERROR', msg: 'User not found. Please register again.'});
					return;
                
				default:
					res.status(500).send({status: 'ERROR', msg: 'Server Error while registration.'});
					return;
			}
		}
		res.status(200).send({status: 'SUCCEESS',  msg: 'Succesfully Updated area of interest.'});
		return;
	});

	function validate_body (callback)
	{
		console.log(JSON.stringify(req.body) + ' type of area is : '+ typeof(req.body.area_of_interest));
		req.checkBody('email_id', 'Email is required').notEmpty().isEmail();
		req.checkBody('area_of_interest', 'area_of_interest is required').notEmpty();

		var errors = req.validationErrors();
		
		if (errors)
		{
			console.log('Vlidation error' + JSON.stringify(errors));
			callback(errors, 'REQUEST_BODY_VALION_ERROR');
			return;
		} else {
			callback(null);
		}
	}

	function Update_area (callback)
	{
		var areas = [];
		areas = req.body.area_of_interest.split(', ');
		var unique = areas.filter( onlyUnique );
		var query = {email_id: req.body.email_id};
		var update = {
			$set : {
				area_of_interest : unique,
			}
		};
		var options = {
			upsert: false
		};
		User_profile.findOneAndUpdate(query, update,options, function(error, data){
			if (error)
			{
				console.log('INTERNAL_DB_ERROR in updating user profile with email_id: ' + req.body.email_id);
				callback(error, 'INTERNAL_DB_ERROR');
				return;
			}
			if (!data)
			{
				console.log('USER_NOT_FOUNND with email_id: ' + req.body.email_id);
				callback('ERROR', 'USER_NOT_FOUNND');
				return;
			}
			callback(null);
			return;
		});
	}

	function onlyUnique(value, index, self)
	{ 
    	return self.indexOf(value) === index;
	}
});


// AREA 
router.get('/area', function (req, res)
{
	// var areas = ['algorithm', 'machine learning', 'maths', 'cera', 'physics', 'chemistry', 'general', 'biology', 'cse'];
	var areas = ['Materials Science And Technology', 'Computer Science Engineering', 'Mechanical Engineering', 'Electrical Engineering' , 'Civil Engineering', 'Chemical Engineering', 'Electronic Engineering', 'Metallurgical Engineering', 'Mining Engineering', 'Ceramic Engineering', 'Mathematics and Computing', 'Biochemical Engineering', 'Biomedical Engineering'];
	res.send(areas);
});




//API for updating the area of expertise.
router.post('/area-expertise', function(req, res)
{
	var areas =[];
	console.log('Post request on area of expertise API');
	waterfall([
		validate_body,
		Update_area
	], function(error, message)
	{
		if (error)
		{
			switch (message)
			{
				case 'REQUEST_BODY_VALIDATION_ERROR':
					res.status(400).send({status: 'ERROR', msg: 'Validation error in area-expertise.'});
					return;

				case 'NOT_VALID_WORD':
					res.status(400).send({status: 'ERROR', msg: 'Not a vlaid word for area.'});
					return;

    			case 'USER_NOT_FOUND':
					res.status(400).send({status: 'ERROR', msg: 'User not found. Please register again.'});
					return;
                
				default:
					res.status(500).send({status: 'ERROR', msg: 'Server Error while registration.'});
					return;
			}
		}
		res.status(200).send({status: 'SUCCEESS',  msg: 'Succesfully Updated area of expertise.'});
		return;
	});

	function validate_body (callback)
	{
		console.log(JSON.stringify(req.body) + ' type of area is : '+ JSON.stringify(req.body.area_of_expertise[0]));
		req.checkBody('email_id', 'Email is required').notEmpty().isEmail();
		req.checkBody('area_of_expertise', 'area_of_expertise is required').notEmpty();

		for (var i = req.body.area_of_expertise.length - 1; i >= 0; i--)
		{
			console.log("ander : " + i);
			if(words.check(req.body.area_of_expertise[i]))
			{
				areas.push(req.body.area_of_expertise[i]);
			}
			else 
			{

			}
		}
		console.log('bahar')
		var errors = req.validationErrors();
		
		if (errors)
		{
			console.log('Vlidation error' + errors)
			callback(errors, 'REQUEST_BODY_VALIDATION_ERROR');
			return;
		} else {
			callback(null);
		}
	}

	function Update_area (callback)
	{
		var query = {email_id: req.body.email_id};
		var update = {
			$set : {
				area_of_expertise: areas
			}
		};
		var options = {upsert: false};
		User_profile.findOneAndUpdate(query, update,options, function(error, data){
			if (error)
			{
				console.log('INTERNAL_DB_ERROR in updating user profile with email_id: ' + req.body.email_id);
				callback(error, 'INTERNAL_DB_ERROR');
				return;
			}
			if (!data)
			{
				console.log('USER_NOT_FOUND with email_id: ' + req.body.email_id);
				callback('ERROR', 'USER_NOT_FOUND');
				return;
			}
			callback(null);
			return;
		});
	}
});



module.exports = router;
