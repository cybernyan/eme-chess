
var infoColor = 'green';
var errorColor = 'red;'

socket.on('updateUsers', function(connectedUsersHtml,waitingUsersHtml,gamesHtml) {

    var connectedUsers = document.getElementById("connected-users-list");
    connectedUsers.innerHTML = connectedUsersHtml;
    
    var waitingUsers = document.getElementById("in-lobby-list");
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
    addInfo("Move rejected: " + data,errorColor);
});

socket.on('closeGame', function(reason) {
    gameActive = false;
    addInfo("Game finished because of " + reason,errorColor);
});


socket.on('checkmate', function() {
    addInfo("Checkmate",infoColor);
});

socket.on('stalemate', function() {
    addInfo("Stalemate",infoColor);
});

socket.on('check', function() {
    addInfo("Check",infoColor);
});

socket.on('trippledraw', function() {
    addInfo("Tripple Draw !",infoColor);
});



socket.on('startGame', function(color) {
    addInfo("New game started.",infoColor);
    playerColor = color;
    gameActive = true;
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


function addInfo(str,color) {

    if (str == undefined) return;

    var infoDiv = document.getElementById('log');
    var styleColor = ' style="color: ' + color + ';"';
    infoDiv.innerHTML += `<div${color ? styleColor : ""}>${str}</div>`;
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

