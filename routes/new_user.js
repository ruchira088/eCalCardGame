var express = require('express');
var database = require('../database');
var requestDispatcher = require('../requestDispatcher');
var router = express.Router();

router.get("/", function(request, response){
    response.render("new_user");
});

router.post("/", function(request, response)
{
    database.createUser(request.body);

    response.send("new_user");
});

router.get("/usernameCheck", function(request, response)
{
    var user = {username: request.query.name};

    requestDispatcher.checkUsernameAvailability(user, function(available)
    {
        response.send(available);
    });

    //database.login(user, function(exists)
    //{
    //    response.send(!exists);
    //});
});

module.exports = router;