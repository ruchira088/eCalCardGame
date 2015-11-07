var express = require('express');
var database = require('../database');
var router = express.Router();

router.get("/", function(request, response){
    response.render("new_user");
});

router.post("/", function(request, response)
{
    database.createUser(request.body);

    response.send("new_user");
});

router.post("/hello", function(request, response){
    response.send("Hello");
});

module.exports = router;