var express = require('express');
var router = express.Router();

router.get("/*", function(request, response)
{
    response.redirect("/game/login");
});

module.exports = router;
