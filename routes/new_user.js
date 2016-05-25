var router = require("express").Router();
var Constants = require("../public/javascripts/shared").Constants;

var requestDispatcher = require('../requestDispatcher');
var playerTokens = require("./game").playerTokens;

const crypto = require("crypto");
const SALT_LENGTH = 64;
const ITERATIONS = 1024;
const KEY_LENGTH = 256;
const DIGEST = "sha512";
const ENCODING = "base64";

function encryptPassword(password, salt, callback)
{
    salt = salt || crypto.randomBytes(SALT_LENGTH).toString(ENCODING);
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, DIGEST, function(err, key)
    {
       callback(err, key.toString(ENCODING), salt);
    });
}

router.get("/", function(request, response)
{
    response.render("new_user");
});

router.post("/", function(request, response)
{
    encryptPassword(request.body.password, null, function(err, key, salt)
    {
        request.body.password = key;
        request.body.salt = salt;

        requestDispatcher.createUser(request.body, function(data)
        {
            var username = data.document.username;

            playerTokens.addPlayer(username);
            response.cookie(Constants.UserInformation, playerTokens.getCookie(username));
            response.redirect("/game/home");
        });
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

module.exports = {
    router: router,
    encryptPassword: encryptPassword,
    Hello: "Hello"
};