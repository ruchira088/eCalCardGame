var router = require('express').Router();

var Constants = require("../public/javascripts/shared").Constants;
var requestDispatcher = require('../requestDispatcher');
var playerTokens = require("./game").playerTokens;

router.get("/", function(request, response){
    response.render("new_user");
});

router.post("/", function(request, response)
{
    requestDispatcher.createUser(request.body, function(data)
    {
        var username = data.document.username;

        playerTokens.addPlayer(username);
        response.cookie(Constants.UserInformation, playerTokens.getCookie(username));
        response.redirect("/game/home");
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