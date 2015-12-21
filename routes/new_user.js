var express = require('express');
var requestDispatcher = require('../requestDispatcher');
var router = express.Router();

router.get("/", function(request, response){
    response.render("new_user");
});

router.post("/", function(request, response)
{
    requestDispatcher.createUser(request.body, function()
    {
        response.send("new_user");
    });
});

router.get("/usernameCheck", function(request, response)
{
    var user = {username: request.query.name};

    requestDispatcher.checkUsernameAvailability(user, function(available)
    {
        response.send(available);
    });

});

module.exports = router;