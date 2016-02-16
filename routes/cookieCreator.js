/**
 * Created by Ruchira on 15/02/2016.
 */
var router = require("express").Router();

router.post("/", function(request, response)
{
    response.cookie("gameInfo", request.body.gameType);
    response.send("success");
});


module.exports = {
    router: router
};