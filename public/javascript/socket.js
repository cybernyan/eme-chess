

socket.on('updateUsers', function(connectedUsersHtml,waitingUsersHtml,gamesHtml) {

    var connectedUsers = document.getElementById("connectedUsers");
    connectedUsers.innerHTML = connectedUsersHtml;

    var waitingUsers = document.getElementById("waitingUsers");
    waitingUsers.innerHTML = waitingUsersHtml;

    var games = document.getElementById("games");
    games.innerHTML = gamesHtml;

});

socket.on('updateStats', function(statsHtml) {

    var yourStats = document.getElementById("yourStats");
    yourStats.innerHTML = statsHtml;

});




socket.on('updateChessboard', function(data,madeMove) {

    addInfo(madeMove);
    chessmen = data; // update
    repaintBoard();
});

socket.on('moveRejected', function(data) {
    addInfo("Move rejected: " + data);
});

socket.on('closeGame', function(reason) {
    addInfo("Game finished because of " + reason);
});


socket.on('checkmate', function() {
    addInfo("Checkmate");
});

socket.on('stalemate', function() {
    addInfo("Stalemate");
});

socket.on('check', function() {
    addInfo("Check");
});

socket.on('trippledraw', function() {
    addInfo("Tripple Draw !!");
});



socket.on('startGame', function(color) {
    setInfo("START A NEW GAME<br/>");
    playerColor = color;
});

function changePromotion(type) {
    socket.emit("changePromotion",type);
}



function showPromotionDialog() {
    var x = document.createElement("DIALOG");
    x.show();
}

function send() {
    // add this player to queue of players
    socket.emit("startRequest");
}

function setInfo(str) {
    var infoDiv = document.getElementById('log');
    infoDiv.innerHTML = str;
}

function addInfo(str) {
    if (str == undefined) {
        return;
    }

    var infoDiv = document.getElementById('log');
    infoDiv.innerHTML += str + "<br/>";
    infoDiv.scrollTop = infoDiv.scrollHeight - infoDiv.clientHeight;
}

function drawRequest() {
    socket.emit("drawRequest");
}

function drawResponse(response) {
    socket.emit("drawResponse",response);
}

socket.on('drawOffer', function(data) {
    var answer = window.confirm("Przeciwnik proponuje remis. Zgadzasz się?")
    if (answer) {
        drawResponse(true);
    } else {
        drawResponse(false);
    }
});

function giveUp() {
    socket.emit("giveUp");
}

