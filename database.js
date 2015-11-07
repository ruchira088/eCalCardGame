var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');

var USER_COLLECTION = "users";

var url = "mongodb://localhost:27017/CardGame";

function execute(query)
{
    MongoClient.connect(url, function(err, db)
    {
        assert.equal(null, err);
        console.log("Connected to DB");
        query(db);
    });
}

login = function (user, next)
{
    var login = function(db)
    {
        var userCollection = db.collection(USER_COLLECTION);
        userCollection.find(user).hasNext(
            function(err, hasNext)
            {
                next(hasNext);
                db.close();
            }
        );
    };

    execute(login);
};

createUser = function(user)
{
    var createUser = function(db)
    {
        var userCollection = db.collection(USER_COLLECTION);
        userCollection.insertOne(user, {w:1}, function(err, result)
        {
            if(err == null)
            {
                console.log(user.username + " was added to onlineUsers");
            }

            db.close();
        });
    };

    execute(createUser);
};

something = function()
{
    console.log("Hello World");
};

module.exports = {
    createUser : createUser,
    login : login

};