var g_actionMap;

var g_webSocket;

function verifyAndSubmit(form)
{
    submitForm(form);
}

function submitForm(form)
{
    var username = form.querySelector("#loginForm [name='username']").value;
    var password = form.querySelector("#loginForm [name='password']").value;

    var request = new XMLHttpRequest();
    request.onreadystatechange = function()
    {
        if(request.readyState == 4 && request.status == 200)
        {
            if(request.responseText === "success")
            {
                form.submit();
            }
            else
            {
                showError("Invalid Credentials");
            }
        }
    };

    request.open("post","/game/home");
    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    request.send("username=" + username + "&password=" + password + "&verify=true");
}

function declareVictory() 
{
    send({type: Constants.DeclareVictory, value: ""});
}


/**  Get the username */
function getUsername()
{
    var usernameElement = document.getElementById("username");

    return usernameElement.getAttribute("data-username");
}

function pickUpCard(card)
{
    var event = {type: Constants.CardPickUp, value: card.getAttribute(Constants.CardSource)};

    send(event);

}

function showDeckCard(card)
{
    $(createCardElement(new Card(card.suit, card.number)))
        .attr("id", "deckCard").insertAfter("#cardDeck");
}

function createCardElement(card)
{
    return $("<img>").attr({
        "data-card-value": card.getValue(),
        src : card.getPicture(),
        class: "playingCard"
    }).draggable();
}

function performAction(message)
{
    if (!g_actionMap)
    {
        g_actionMap = new Map();

        g_actionMap.set(Constants.LoggedInUser, addToOnlineUserTable);

        g_actionMap.set(Constants.DeckCardPickUp, showDeckCard);

        g_actionMap.set(Constants.UpdateDrawnCard, function(value)
        {
            var card = new Card(value.suit, value.number);
            createDrawnCard(card);
        });

        g_actionMap.set(Constants.ActiveUser, function(value)
        {
            highlightActivePlayer(value);
        });

        g_actionMap.set(Constants.WaitForTurn, function(value)
        {
            showError("It is not your turn.");
        });

        g_actionMap.set(Constants.DrawnCardPickUp, function (value)
        {
            console.log(value)
        });

        g_actionMap.set(Constants.FalseVictoryDeclaration, falseVictory);

        g_actionMap.set(Constants.FalseVictoryAnnouncement, opponentFalseVictoryAnnouncement);

        g_actionMap.set(Constants.VictoryAnnouncement, showWinningCards);

        g_actionMap.set(Constants.Victory, victoryDialog);

        g_actionMap.set(Constants.ChatMessage, receivedMessage);

        g_actionMap.set(Constants.UserLoggedOut, userLoggedOut);

        g_actionMap.set(Constants.Information, function (value)
        {
            console.log(value);
            showInfo(value);
        });
    }

    var action = g_actionMap.get(message.type);
    action(message.value);
}

function opponentFalseVictoryAnnouncement(message)
{
    console.log(message.player + " falsely announced victory");
}

function userLoggedOut(message)
{
    showInfo(message.loggedOutUser + " has logged out.");
    removeUserFromOnlineTableMarkup(message.loggedOutUser);
}

function removeUserFromOnlineTableMarkup(username)
{
    console.log("Removing " + username);
    $("table #" + username).parent().remove();
}

function receivedMessage(message)
{
    var sender = message.sender;
    var messageContents = message.message;

    pushToChatConsole($("<span class='message'></span>").append($("<span class='sender'></span>").html(sender)).
    append($("<span class='seperator'></span>").html(" : ")).
    append($("<span class='messageContents'></span>").html(messageContents)));

   // pushToChatConsole(sender + " : " + messageContents);
}

function victoryDialog(value)
{
    $("#winningCards .modal-header").html($("<span id='winnerHeader'>WINNER</span>"));
    $("#winningCards .modal-body").append($("<div id='winnerMessage'></div>").html("Congratulations you WON the game.")).append(getWinningSets(value.cardSets));
    $('#winningCards').modal('show');
}
function showWinningCards(value)
{
    $("#winningCards .modal-header").html($("<div id='winnerHeader'></div>").html(value.winner + " has WON"));
    $("#winningCards .modal-body").append(getWinningSets(value.cardSets));
    $('#winningCards').modal('show');
}

function falseVictory(cards)
{
    $("#winningCards .modal-header").html($("<span id='loserHeader'>LOSER</span>"));
    $("#winningCards .modal-body").append($("<div id='winnerMessage'></div>").html("You LOST the game.")).append((function()
    {
        return cards.reduce(function(losingCardsMarkup, card)
        {
            var cardValue = card.split("_");
            var playingCard = new Card(cardValue[1], cardValue[0]);
            var cardMarkup = new Image();
            cardMarkup.src = playingCard.getPicture();
            cardMarkup.className = "playingCard";

            losingCardsMarkup.appendChild(cardMarkup);

            return losingCardsMarkup;

        }, (function(){

            var losingCards = document.createElement("div");
            losingCards.id = "losingCards";

            return losingCards;

        })());

    })());

    $('#winningCards').modal('show');
}



//function showWinningCards(value)
//{
//    var header = "<div id='winnerHeader'>" + value.winner + " has WON</div>";
//
//    var modalHeader = document.querySelector("#winningCards .modal-header");
//    modalHeader.innerHTML = header;
//
//
//    var winningCardsMarkup = value.cardSets.reduce(function(markup, cardSet)
//    {
//        var setNumber = value.cardSets.indexOf(cardSet) + 1;
//        var setCardsId = "setCards_" + setNumber;
//
//        var setMarkup = cardSet.reduce(function(cardSetMarkup, card)
//        {
//            var playingCard = new Card(card.suit, card.value);
//            var cardMarkup = new Image();
//            cardMarkup.src = playingCard.getPicture();
//            cardMarkup.className = "playingCard";
//
//            cardSetMarkup.querySelector("#" + setCardsId).appendChild(cardMarkup);
//            //cardSetMarkup.appendChild(cardMarkup);
//
//            return cardSetMarkup;
//        }, (function()
//        {
//            var cardSetMarkup = document.createElement("div");
//            cardSetMarkup.className = "cardSet";
//            cardSetMarkup.id = "cardSet_" + setNumber;
//
//            var setLabel = document.createElement("span");
//            setLabel.className = "setLabel";
//            setLabel.innerHTML = "Set " + setNumber;
//
//            cardSetMarkup.appendChild(setLabel);
//
//            var cards = document.createElement("span");
//            cards.id = setCardsId;
//            cards.className = "setCards";
//
//            cardSetMarkup.appendChild(cards);
//
//            return cardSetMarkup;
//        })());
//
//        markup.appendChild(setMarkup);
//
//        return markup;
//    }, (function()
//    {
//        var winningCardsMarkup = document.createElement("div");
//        winningCardsMarkup.id = "Winning_Cards";
//
//        return winningCardsMarkup;
//    })());
//
//    console.log(winningCardsMarkup);
//
//    var modalBody = document.querySelector("#winningCards .modal-body");
//    modalBody.appendChild(winningCardsMarkup);
//    //modalBody.innerHTML = value.markup;
//
//    $('#winningCards').modal('show');
//}

function getWinningSets(cardSets)
{
    return cardSets.reduce(function(markup, cardSet)
    {
        var setNumber = cardSets.indexOf(cardSet) + 1;
        var setCardsId = "setCards_" + setNumber;

        var setMarkup = cardSet.reduce(function(cardSetMarkup, card)
        {
            var playingCard = new Card(card.suit, card.value);
            var cardMarkup = new Image();
            cardMarkup.src = playingCard.getPicture();
            cardMarkup.className = "playingCard";

            cardSetMarkup.querySelector("#" + setCardsId).appendChild(cardMarkup);
            //cardSetMarkup.appendChild(cardMarkup);

            return cardSetMarkup;
        }, (function()
        {
            var cardSetMarkup = document.createElement("div");
            cardSetMarkup.className = "cardSet";
            cardSetMarkup.id = "cardSet_" + setNumber;

            var setLabel = document.createElement("span");
            setLabel.className = "setLabel";
            setLabel.innerHTML = "Set " + setNumber;

            cardSetMarkup.appendChild(setLabel);

            var cards = document.createElement("span");
            cards.id = setCardsId;
            cards.className = "setCards";

            cardSetMarkup.appendChild(cards);

            return cardSetMarkup;
        })());

        markup.appendChild(setMarkup);

        return markup;
    }, (function()
    {
        var winningCardsMarkup = document.createElement("div");
        winningCardsMarkup.id = "winningCards";

        return winningCardsMarkup;
    })());
}


function highlightActivePlayer(playerId)
{
    var players = document.querySelectorAll("#onlinePlayers td");

    for(var i = 0; i < players.length; i++)
    {
        var player = players[i];

        player.removeAttribute("data-active-player");
    }

    var activePlayer = document.querySelector("#onlinePlayers #" + playerId.replace(" ", ""));
    activePlayer.setAttribute("data-active-player", "true");
}
/** Add a user to the "online user table" */
function addToOnlineUserTable(loggedInUser)
{
    $("#players").append($("<tr></tr>").html($("<td id='"+ loggedInUser+"' class='player'></td>").html(loggedInUser)));
    showInfo(loggedInUser + " logged in.");
}

/** Send a message to the web socket server */
function send(message)
{
    if (!g_webSocket)
    {
        initWebSocket(getUsername(), message);
    }
    else
    {
        g_webSocket.send(JSON.stringify(message));
    }
}

/** Initialize the web socket */
function initWebSocket(username, message)
{
    g_webSocket = new WebSocket("ws://" + location.hostname + ":" + Constants.WEB_SOCKET_SERVER_PORT);

    g_webSocket.onopen = function ()
    {
        console.log("Success");
        send({type: Constants.Login, value: username});

        if (message)
        {
            send(message);
        }
    };

    g_webSocket.onmessage = function (jsonMessage)
    {
        performAction(JSON.parse(jsonMessage.data));
    };
}



function createCard(value)
{
    var values = value.split("_");

    return new Card(values[1], values[0]);
}

function getCurrentUser() {
    return document.querySelector("[data-active-player]").id;
}

function isDeckCardVisible() {
    var visibleDeckCard = document.querySelectorAll("[" + Constants.VisibleDeckCard + "]");

    return visibleDeckCard.length == 1;
}

function dropFunction(event, ui)
{
    $(this).css({opacity: 1});

    var currentCardValue = $(this).attr("data-card-value");

    var sourceCard = event.toElement;
    var cardValue = $(sourceCard).attr("data-card-value");

    changeCardValue(this, cardValue);
    $(sourceCard).remove();

    send({type: Constants.CardDrop, value: createCard(currentCardValue), srcCard: createCard(cardValue)});
}

function overFunction(event, ui)
{
    $(this).css({opacity: 0.5});
}

function outFunction(event, ui)
{
    $(this).css({opacity: 1});
}

function acceptFunction(acceptCondition)
{
    return function(droppedElement)
    {
        var accept = false;

        if(getCurrentUser() == getUsername())
        {
            if(acceptCondition(droppedElement))
            {
                accept = true;
            }
        }

        return accept;
    }
}

function createDrawnCard(card)
{
    var cardElement = createCardElement(card);
    $(cardElement).droppable(
        {
            drop: function(event, ui)
            {
                var sourceCardValue = $("#deckCard").attr("data-card-value");
                $(this).remove();
                $("#deckCard").remove();
                send({type: Constants.CardDrop, value: createCard(sourceCardValue)});
            },
            over: overFunction,
            out: outFunction,
            accept: acceptFunction(function(droppedElement)
            {
                return droppedElement[0] == $("#deckCard")[0];
            })
        }
    );
    $("#drawnCard").empty().append(cardElement);
}

function changeCardValue(cardElement, value)
{
    var cardValue = $(cardElement).attr("data-card-value");
    var cardImage = $(cardElement).attr("src");

    var imagePath = cardImage.substring(0, cardImage.indexOf(cardValue)) + value + ".png";

    $(cardElement).attr("data-card-value", value);
    $(cardElement).attr("src", imagePath);
}

function initNotifications() {
    toastr.options = {
        "closeButton": false,
        "debug": false,
        "newestOnTop": true,
        "progressBar": false,
        "positionClass": "toast-top-right",
        "preventDuplicates": false,
        "onclick": null,
        "showDuration": "300",
        "hideDuration": "1000",
        "timeOut": "1000",
        "extendedTimeOut": "1000",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "slideDown",
        "hideMethod": "fadeOut"
    };
}

function showInfo(message) {
    initNotifications();

    toastr["info"](message);
}

function showSuccess(message) {
    initNotifications();

    toastr["success"](message);
}

function showError(message) {
    initNotifications();

    toastr["error"](message);
}

function showWarning(message) {
    initNotifications();

    toastr["warning"](message);
}

function confirmPassword(success, fail)
{
    $("#passwordMatch").hide();
    $("#passwordNoMatch").hide();

    var passwordValue = $('#password')[0].value;
    var confirmValue = $('#confirm')[0].value;

    if(passwordValue.length != 0 && confirmValue.length != 0)
    {
        if(confirmValue === passwordValue)
        {
            $("#passwordMatch").show();
            if(success)
            {
                success();
            }
        } else
        {
            $("#passwordNoMatch").show();
            if(fail)
            {
                fail();
            }
        }
    }

}

function checkUsername(success, fail)
{
    var username = $("#username input")[0].value;

    $("#usernameTaken").hide();
    $("#usernameAvailable").hide();

    if(username.length != 0)
    {
        $.get("new_user/usernameCheck", {name: username}, function(usernameAvailable)
        {
            if(usernameAvailable == true)
            {
                $("#usernameAvailable").show();
                if(success)
                {
                    success();
                }
            } else
            {
                $("#usernameTaken").show();

                if(fail)
                {
                    fail();
                }
            }
        });
    }
}

function validateAndSubmit(form)
{
    checkUsername(function()
    {
        confirmPassword(function()
        {
            form.submit();
        }, showUserFormError);
    }, showUserFormError);

    function showUserFormError()
    {
        showError("Please complete the form.");
    }
}

function sendChatMessage(message)
{
    send({type: Constants.ChatMessage, value: message});
}

function pushToChatConsole(value)
{
    $("#chatConsole").append(value).scrollTop($("#chatConsole").prop("scrollHeight"));
    //$("#chatConsole").append($("<div class='chatConsoleEntry'></div>").text(value)).
    //    scrollTop($("#chatConsole").prop("scrollHeight"));
}

function addEventListenersToCards(cards)
{
    for (var i = 0; i < cards.length; i++) {
        addEventListenersToCard(cards[i]);
    }
}