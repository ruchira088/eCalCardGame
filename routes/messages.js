const router = require("express").Router()
const rp = require("request-promise")

const MESSAGING_SERVICE = "http://localhost:9000/messages"

// Remove later
const dummySender = "dummySender"
const dummyReceiver = "dummyReceiver"

router.get("/", (request, response) =>
{
    response.render("messages");
});

router.get("/get", (request, response) =>
{
	rp({
		uri: MESSAGING_SERVICE,
		qs: {receiver: dummyReceiver},
		json: true
	})
	.then(responseBody => 
	{
		response.json({messages: responseBody})
	})
});

router.post("/post", (request, response) => 
{
	const requestBody = request.body
	requestBody.sender = dummySender

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