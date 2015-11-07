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

function dragEnd(ev)
{
    ev.srcElement.removeAttribute("style");
}

function dragOver(ev)
{
    ev.preventDefault();
}

function dragStart(ev)
{
    ev.dataTransfer.setData("card-value", ev.srcElement.getAttribute(Constants.CardValue));
    ev.srcElement.setAttribute("style", "opacity:0.5;");
    //ev.srcElement.setAttribute("hidden", true);
    //console.log("dragStart = " + ev.srcElement.getAttribute("data-card-value"));
}

function dropCard(ev)
{
    ev.preventDefault();
    var sourceCardValue = ev.dataTransfer.getData("card-value");
    var sourceCard = document.querySelector("[" + Constants.CardValue + "='" + sourceCardValue + "']");
    var targetCard = ev.srcElement;
    console.log(targetCard.className);

    // if(!sourceCard.getAttribute(Constants.CARD_SOURCE) || sourceCard.getAttribute(Constants.CARD_SOURCE) && getCurrentUser() === getUsername)
    if (sourceCard) {
        targetCard.parentNode.insertBefore(sourceCard, targetCard);
    }
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
    var card = createCardElement(new Card(card.suit, card.number));
    card.setAttribute(Constants.VisibleDeckCard, "true");
    card.removeEventListener("dragover", dragOver);
    card.removeEventListener("drop", dropCard);
    card.addEventListener("dragend", function () {
        addEventListenersToCard(card);
        card.removeAttribute(Constants.VisibleDeckCard);
    });

    var cardDeck = document.getElementById("cardDeck");
    cardDeck.parentNode.insertBefore(card, cardDeck.nextElementSibling);

    console.log(card);
}

function createCardElement(card)
{
    var cardElement = document.createElement("img");
    cardElement.setAttribute(Constants.CardValue, card.getValue());
    cardElement.src = card.getPicture();
    cardElement.setAttribute("class", "playingCard");
    cardElement.setAttribute("draggable", "true");
    addEventListenersToCard(cardElement);

    //cardElement.addEventListener("dragstart", dragStart);
    //cardElement.addEventListener("dragend", function(ev)
    //{
    //    dragEnd(ev);
    //    addEventListenersToCard(cardElement);
    //    cardElement.setAttribute("class", cardElement.className + " playerHand");
    //});

    return cardElement;
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

        g_actionMap.set(Constants.VictoryAnnouncement, showWinningCards);

        g_actionMap.set(Constants.Information, function (value)
        {
            console.log(value)
        });
    }

    var action = g_actionMap.get(message.type);
    action(message.value);
}

function showWinningCards(value) {
    var header = value.winner + " is announcing victory";

    var modalHeader = document.querySelector("#winningCards .modal-header");
    modalHeader.innerHTML = header;

    var modalBody = document.querySelector("#winningCards .modal-body");
    modalBody.innerHTML = value.markup;
    //modalBody.innerHTML = "Hello World";

    $('#winningCards').modal('show');
}

function highlightActivePlayer(playerId)
{
    var players = document.querySelectorAll("#onlinePlayers li");

    for(var i = 0; i < players.length; i++)
    {
        var player = players[i];

        player.removeAttribute("data-active-player");
    }

    var activePlayer = document.querySelector("#onlinePlayers #" + playerId);
    activePlayer.setAttribute("data-active-player", "true");
}
/** Add a user to the "online user table" */
function addToOnlineUserTable(loggedInUser)
{
    var onlineUsers = document.querySelector("#onlineUsers ul");

    var user = document.createElement("li");
    user.innerHTML = loggedInUser;

    onlineUsers.appendChild(user);
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
    g_webSocket = new WebSocket("ws://localhost:8080");

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


function addEventListenersToCard(card) {
    card.addEventListener("dragstart", dragStart);
    card.addEventListener("drop", dropCard);
    card.addEventListener("dragend", dragEnd);
    card.addEventListener("dragover", dragOver);
}

function declareVictory() {
    send({type: Constants.DeclareVictory, value: document.getElementById('playerHand').innerHTML});
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



function createDrawnCard(card)
{
    var drawnCardPlaceholder = document.getElementById("drawnCard");
    var drawnCard = drawnCardPlaceholder.querySelector("img");

    // TODO
    if (drawnCard) {
        drawnCard.remove();
    }

    var cardElement = createCardElement(card);

    function isValidDrop()
    {
        var playerCards = document.querySelectorAll("#playerHand img.playingCard");
        var visibleDeckCard = document.querySelectorAll("[" + Constants.VisibleDeckCard + "]");
        return (playerCards.length + visibleDeckCard.length) == 10;
    }

    function drop(ev)
    {
        ev.preventDefault();

        if(isValidDrop())
        {
            var sourceCardValue = ev.dataTransfer.getData("card-value");
            var sourceCard = document.querySelector("[" + Constants.CardValue + "='" + sourceCardValue + "']");
            sourceCard.remove();

            //createDrawnCard(createCard(sourceCardValue));
            send({type: Constants.CardDrop, value: createCard(sourceCardValue)});
        }
        else
        {
            showWarning("Not a valid move.");
        }

    }

    function createPlaceholder()
    {
        var cardPlaceholder = document.createElement("img");
        cardPlaceholder.setAttribute("class", "playingCard");
        cardPlaceholder.src = "/images/deck/backOfCard.png";
        drawnCardPlaceholder.appendChild(cardPlaceholder);
        cardPlaceholder.addEventListener("drop", drop);
        cardPlaceholder.addEventListener("dragover", dragOver)

    }

    cardElement.removeEventListener("dragstart", dragStart);
    cardElement.addEventListener("dragstart", function (ev) {
        if (getCurrentUser() === getUsername() && !isDeckCardVisible() && document.querySelectorAll("#playerHand img.playingCard").length == 9) {
            dragStart(ev);
        }
    });
    cardElement.removeEventListener("drop", dropCard);
    cardElement.addEventListener("drop", drop);
    cardElement.addEventListener("dragend", function dragEnd() {
        if (getCurrentUser() === getUsername() && !isDeckCardVisible() && cardElement.parentElement.id != "drawnCard" && document.querySelectorAll("#playerHand img.playingCard").length == 10) {
            cardElement.removeEventListener("drop", drop);
            cardElement.removeEventListener("dragend", dragEnd);
            addEventListenersToCard(cardElement);
            createPlaceholder();
            send({type: Constants.CardPickUp, value: ""});
        } else
        {
            showWarning("Not a valid move.");
        }
    });

    drawnCardPlaceholder.setAttribute("data-cardSource", Constants.CARD_SOURCE.DRAWN_PILE);
    drawnCardPlaceholder.appendChild(cardElement);

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

function addEventListenersToCards(cards)
{
    for (var i = 0; i < cards.length; i++) {
        addEventListenersToCard(cards[i]);
    }
}