const router = require("express").Router();

router.get("/", (request, response) =>
{
    response.render("messages");
});

router.get("/get", (request, response) =>
{
    response.json({
        messages: [
            {sender: "Cat", title: "Meow"},
            {sender: "wpsadmin", title: "Hello"}
        ]
    });
});

router.post("/post", (request, response) => 
{
	console.log(JSON.stringify(request.body))
	response.json(
		{result: "success"}
	)
})

module.exports = router;