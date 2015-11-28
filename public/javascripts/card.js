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

    $('#winningCards').modal('show');
}

function highlightActivePlayer(playerId)
{
    var players = document.querySelectorAll("#onlinePlayers td");

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
    $("#players").append($("<tr></tr>").html($("<td></td>").html(loggedInUser)));
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

function dropFunction(event, ui)
{
    $(this).css({opacity: 1});

    var currentCardValue = $(this).attr("data-card-value");

    send({type: Constants.CardDrop, value: createCard(currentCardValue)});

    var sourceCard = event.toElement;
    var cardValue = $(sourceCard).attr("data-card-value");

    changeCardValue(this, cardValue);
    $(sourceCard).remove();
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

function confirmPassword(confirm, password)
{
    $("#passwordMatch").hide();
    $("#passwordNoMatch").hide();

    var passwordValue = password.value;
    var confirmValue = confirm.value;

    if(passwordValue.length != 0 && confirmValue.length != 0)
    {
        if(confirmValue === passwordValue)
        {
            $("#passwordMatch").show();
        } else
        {
            $("#passwordNoMatch").show();
        }
    }

    console.log(confirm.value);
    console.log(password.value);
}

function addEventListenersToCards(cards)
{
    for (var i = 0; i < cards.length; i++) {
        addEventListenersToCard(cards[i]);
    }
}