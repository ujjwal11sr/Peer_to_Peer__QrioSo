'use strict'
var express = require('express');
var waterfall = require('async/waterfall');
var eachSeries = require('async-each-series');
var keyword_extractor = require("keyword-extractor");
var packages = require('package-list');
var $ = require('jQuery');

var User_profile = require('../models/User');
var Question = require('../models/Questions');

var router = express.Router();

//API for asking a question
router.post('/question', function (req, res)
{
	console.log('Post request on QUESTION API ');
	waterfall([
		validate_body,
		ask_question
	], function(error, message)
	{
		if (error)
		{
			switch (message)
			{
				case 'REQUEST_BODY_VALIDATION_ERROR':
					res.status(400).send({status: 'ERROR', msg: 'Validation error in QUESTION API.'});
					return;

    			case 'DUPLICATE_KEY_ERROR':
					res.status(400).send({status: 'ERROR', msg: 'This question was already has been asked..'});
					return;
                
				default:
					res.status(500).send({status: 'ERROR', msg: 'Server Error while registration.'});
					return;
			}
		}
		res.status(200).send({status: 'SUCCEESS',  msg: 'Succesfully posted your question.'});
		return;
	});

	function validate_body (callback)
	{
		console.log(JSON.stringify(req.body));
		req.checkBody('email_id', 'Email is required').notEmpty().isEmail();
		req.checkBody('area', 'area for question is required').notEmpty();
		req.checkBody('question', 'question is required').notEmpty();

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

	function ask_question (callback)
	{
		var time = new Date();
		console.log(time);
		console.log('kp' + time);

		User_profile.findOne({email_id : req.body.email_id}, {username:1, _id:0}, function (er, name)
		{
			if(er)
			{
				console.log('ERROR in finding username : ' + er);
			}
			// console.log(name);

			var areas = [];
			areas = req.body.area.split(', ');
			console.log("asked: "+areas);
			var unique = areas.filter( onlyUnique );
			console.log("filter: " + unique);
			eachSeries (unique, function (area, cb)
			{
				var new_question;
				if(name)
				{
					new_question = new Question({
						area : area,
						question : req.body.question,
						timestamp : time,
						username : name.username
					});
				}
				else
				{
					new_question = new Question({
						area : area,
						question : req.body.question,
						timestamp : time
					});
				}
				

				new_question.save(function (err, ques)
				{
					if (err && err.name === 'MongoError' && err.code == 11000)
					{
						console.log('This question was already has been asked... ' + err);
						callback(err, 'DUPLICATE_KEY_ERROR');
						return;
					}
					if (err)
					{
						console.log('INTERNAL_DB_ERROR in posting a question ' + err);
						callback(err, 'INTERNAL_DB_ERROR');
		        		return;
					}
					cb();
		      		return;
				});
			}, function(error)
			{
				if (error)
				{
					console.log(error);
				}
				else callback(null);;
			});
		});
	}

	function onlyUnique(value, index, self)
	{ 
    	return self.indexOf(value) === index;
	}
	
	function authenticate_question (callback)
	{
		var check_time = new Date();
		console.log("check_start : " + new Date());
		bcrypt.compareSync (req.body.question, db_password, function(err, result)
		{
			if(err)
			{
				console.log('error in comparing question  ' + err);
				callback('error', 'INTERNAL_DB_ERROR');
				return;
			}
			if (result === false)
			{
				console.log('INVALID_QUESTION');
				callback('error', 'INVALID_QUESTION');
				return;
			}
			
			callback(null);
			return;
		});
	}
});


//API for posting an answer to a question.
router.post('/answer', function(req, res)
{
	var time = new Date();
	console.log(Date(time.toUTCString()).toString());
	var ans_time = new Date(time.toUTCString()).toString();
	console.log('Post request on ANSWER API');
	waterfall([
		validate_body,
		post_answer
	], function(error, message)
	{
		if (error)
		{
			switch (message)
			{
				case 'REQUEST_BODY_VALIDATION_ERROR':
					res.status(400).send({status: 'ERROR', msg: 'Validation error in answer API.'});
					return;

    			case 'QUESTION_NOT_FOUND':
					res.status(400).send({status: 'ERROR', msg: 'This question was not asked/found'});
					return;
                
				default:
					res.status(500).send({status: 'ERROR', msg: 'Server Error while posting anser.'});
					return;
			}
		}
		res.status(200).send({status: 'SUCCESS',  msg: 'Succesfully posted your answer.'});
		return;
	});

	function validate_body (callback)
	{
		console.log(JSON.stringify(req.body));
		// req.checkBody('area', 'area for question is required').notEmpty();
		req.checkBody('Question', 'question is required').notEmpty();
		req.checkBody('Answer', 'answer is required').notEmpty();
		req.checkBody('email_id', 'email_id is required').notEmpty().isEmail();

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

	function post_answer (callback)
	{
		User_profile.findOne({email_id : req.body.email_id}, {username:1, _id:0}, function (er, name)
		{
			if(er)
			{
				console.log('ERROR in finding username : ' + er);
			}
			var update={};
			var query = {
				//area : req.body.area,
				question : req.body.Question
			};
			if(name)
			{
				update = {
					$push : {
						answer: {
						answer : req.body.Answer,
						timestamp : ans_time,
						username : name.username
						}
					}
				};
			}
			else 
			{
				update = {
					$push : {
						answer: {
						answer : req.body.Answer,
						timestamp : ans_time
						}
					}
				};
			}
			var options = {upsert : false, new : true};
			Question.findOneAndUpdate (query , update, options, function (err, data)
			{
				if(err)
				{
					console.log('INTERNAL_DB_ERROR in posting answer '+ JSON.stringify(err) + 'for question : ' + req.body.Question);
					callback(err, 'INTERNAL_DB_ERROR');
					return;
				}
				if (!data)
				{
					console.log('QUESTION_NOT_FOUND');
					callback('ERROR', 'QUESTION_NOT_FOUND');
					return;
				}
				callback(null);
				return;
			});
		});
	}
});


//API for HOME page..
router.get('/:email_id', function (req, res)
{
	var time = new Date();
	console.log('HOME @ ' + time);
	var area_of_interest = [];
	
	var all_questions = [];
	var sorted_questions = [];
	waterfall([
		validate_params,
		fetch_area,
		get_questions
	], function (error, message)
	{
		if (error)
		{
			switch (message)
			{
				case 'REQUEST_BODY_VALIDATION_ERROR':
					res.status(400).send({status: 'ERROR', msg: 'Invalid Email-id.'});
					return;

				case 'USER_NOT_FOUND':
					res.status(400).send({status: 'ERROR', msg: 'User not exist..'});
					return;

    			case 'AREA_NOT_FOUND':
					res.status(400).send({status: 'ERROR', msg: 'Area was not updated by the user'});
					return;
                
				default:
					res.status(500).send({status: 'ERROR', msg: 'Server Error while fetching data.'});
					return;
			}
		}
		var cu = new Date();
		console.log('home response: '+ cu);
		res.send({status: 'SUCCESS',  msg: all_questions});
		// res.send("{\"status\": \"SUCCESS\",\"msg\": [{\"Question\":{\"question\": \"which book is good for ds algo stuff?\",\"username\": \"zyx\",\"timestamp\": \"Fri Jul 13 2018 15:34:24 GMT+0530 (India Standard Time)\"},\"Answer\": [{\"answer\": \"cormen\",\"timestamp\": \"2018-07-13T10:24:15.391Z\",\"username\": \"bench\"},{\"answer\": \"let us C\",\"timestamp\": \"2018-07-13T10:24:32.266Z\",\"username\": \"bench\"}]},{\"Question\": {\"question\": \"how many books are in the library?\",\"username\": \"zyx\",\"timestamp\": \"Fri Jul 13 2018 15:33:45 GMT+0530 (India Standard Time)\"},\"Answer\": [{\"answer\": \"more than expected\",\"timestamp\": \"2018-07-13T10:25:43.511Z\",\"username\": \"bench\"},{\"answer\": \"countless\",\"timestamp\": \"2018-07-13T10:25:59.270Z\",\"username\": \"bench\"}]}]}");
		return;
	});

	function validate_params (callback)
	{
		req.checkParams('email_id', 'email_id for question is required').notEmpty();

		var errors = req.validationErrors();
		
		if (errors)
		{
			console.log('Vlidation error' + JSON.stringify(errors));
			callback(errors, 'REQUEST_BODY_VALIDATION_ERROR');
			return;
		} else {
			callback(null);
		}
	}

	function fetch_area (callback)
	{
		User_profile.findOne({email_id: req.params.email_id},'area_of_interest' , function (err, data)
		{
			if(err)
			{
				console.log('INTERNAL_DB_ERROR in fetch_area for email_id : ' + req.params.email_id +"error : " + err);
				callback(err, 'INTERNAL_DB_ERROR');
				return;
			}
			if(!data)
			{
				console.log("USER_NOT_FOUND");
				callback('ERROR', 'USER_NOT_FOUND');
				return;
			}
			if (data.area_of_interest.length==0)
			{
				console.log('AREA_NOT_FOUND with email_id: ' + req.params.email_id);
				callback('ERROR', 'AREA_NOT_FOUND');
				return;
			}
			console.log(data);
			area_of_interest = data.area_of_interest;
			callback(null);
			return;
		});
	}

	function get_questions (callback)
	{
		eachSeries(area_of_interest, function(temp, cb)
		{
			Question.find({area: temp}, function(err, result)
			{
				if (err) 
				{
					console.log("Server Error in finding QnA " + err);
					cb();	
					return;
				}
				if (!result)
				{
					console.log('no Queston was asked for the area : ' + temp);
					cb();
					return;
				}
				// console.log('QnA : '+ result);
								
				eachSeries(result, function(one_question, cbb)
				{
					// all_questions.push({
					// 	// area: temp,
					// 	Question: one_question.question,
					// 	Answer: one_question.answer
					// });
					var question_time = new Date (one_question.timestamp.toUTCString());
					sorted_questions.push({
						// area: temp,
						Question : {
							username : one_question.username,
							question: one_question.question,
							timestamp : question_time.toString()
						},
						Answer: one_question.answer
					});
					//date_format(ins.toString());
					cbb();
				}, function(error)
				{
					if (error)
					{
						console.log(error);
					}
					else cb();
				});

			});
		}, function(errors)
		{
			if (errors)
			{
				console.log(errors);
				callback('ERROR', 'ERROR');
			}
			else
			{
				sorted_questions.sort (function(a, b)
				{
					return Date.parse(b.Question.timestamp)-Date.parse(a.Question.timestamp);
				});

				//all_questions = sorted_questions.filter(onlyUnique);
				$.each(sorted_questions, function(i, el)
				{
					console.log("jquery");
					if($.inArray(el, all_questions) === -1) all_questions.push(el);
				});
				//date_format(sorted_questions);
				callback(null);
			}
		});
	}

	function date_format (sorted_questions)
	{
		for (var i = sorted_questions.length - 1; i >= 0; i--) {
			sorted_questions[i].timestamp = sorted_questions[i].timestamp.slice(4,21);
		}
	}

	function onlyUnique(value, index, self)
	{ 
    	return self.indexOf(value) === index;
	}
});


// SEARCH QUESTIONS
router.post('/search', function (req, res)
{
	var time = new Date();
	var all_questions = [];
	console.log("search" + JSON.stringify(req.body) +', time :' + time);
	var sentence = req.body.query;
	var tags = keyword_extractor.extract(sentence,{
		language:"english",
        remove_digits: false,
        return_chained_words: true,
        remove_duplicates: true
	});
	console.log('tags: ' + tags);
	var searched_question = [];
	var search = { $text: {
		$search : tags.join(),
		$caseSensitive: false,
		$diacriticSensitive: true
	}};
	Question.find(search, function(err, result)
	{
		if (err)
		{
			console.log('ERROR in SEARCH API : ' + JSON.stringify(err));
			res.send({status : "ERROR", msg: "Opps Intenal Server Error !!"});
			return;
		}
		if (result.length==0)
		{
			console.log('NO Questions found on the given query : ' + req.body.query);
			res.send({status:"SUCCESS", msg : "No questions found"});
			return;
		}
		eachSeries(result, function(one_question, callback)
		{
			var question_time = new Date (one_question.timestamp.toUTCString());
			searched_question.push({
				// area: temp,
				Question : {
					username : one_question.username,
					question: one_question.question,
					timestamp : question_time.toString()
				},
				Answer: one_question.answer
			});
			callback();
		}, function(error)
		{
			if (error)
			{
				console.log(error);
			}
			else
			{
				searched_question.sort (function(a, b)
				{
					return Date.parse(b.Question.timestamp)-Date.parse(a.Question.timestamp);
				});
				console.log('searched_question :  and the time is :' + new Date());
				all_questions = searched_question.filter(onlyUnique);
				res.send({status : "SUCCESS", msg : all_questions});
			}
		});
	// }).sort({ timestamp:1} );
	});

	function onlyUnique(value, index, self)
	{ 
    	return self.indexOf(value) === index;
	}
});




//API for gettong answer for a particular question
router.get('/qna/:_id', function (req, res)
{
	var answers = [];
	waterfall([
		validate_body,
		get_answer
	], function(error, message)
	{
		if(error)
		{
			switch(message)
			{
				case 'REQUEST_BODY_VALIDATION_ERROR':
					res.status(400).send({status: 'ERROR', msg: 'Validation error in _id'});
					return;

				default:
					res.status(500).send({status: 'ERROR', msg: 'Server Error while fetching data.'});
					return;
			}
		}
		res.status(200).send({status: 'SUCCEESS',  msg: answers});
	});

	function validate_body (callback)
	{
		req.checkParams('_id', '_id for question is required').notEmpty();

		var errors = req.validationErrors();
		
		if (errors)
		{
			console.log('Vlidation error' + JSON.stringify(errors));
			callback(errors, 'REQUEST_BODY_VALIDATION_ERROR');
			return;
		} else {
			callback(null);
		}
	}

	function get_answer (callback)
	{
		Question.findOne({_id:req.params._id}, {answer : 1 , _id : 0}, function (err, data)
		{
			if(err)
			{
				console.log(" error" + err);
				callback(err, "INTERNAL_DB_ERROR");
				return;
			}
			if(data)
			{
				answers = data;
			}
			callback(null);
			return;
		});
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
