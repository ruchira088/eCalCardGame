const router = require("express").Router()
const rp = require("request-promise")

const MESSAGING_SERVICE = "http://localhost:9000/messages"

// Remove later
const sampleUser = "sampleUser"

router.get("/", (request, response) =>
{
    response.render("messages");
});

router.get("/get", (request, response) =>
{
	rp({
		uri: "http://httpbin.org/get",
		qs: {cat: "fluffy"}
	})
	.then(responseBody => console.log(responseBody))

    response.json({
        messages: [
            {sender: "Cat", subject: "Meow"},
            {sender: "wpsadmin", subject: "Hello"}
        ]
    });
});

router.post("/post", (request, response) => 
{
	const requestBody = request.body
	requestBody.sender = sampleUser

	rp({
		method: "POST",
		uri: MESSAGING_SERVICE,
		body: requestBody,
		json: true
	})
	.then(responseBody => 
	{
		response.json(responseBody)
	})
})

module.exports = router;