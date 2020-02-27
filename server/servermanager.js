const { Game } = require('./game.js');
const socket = require('socket.io');
const dbManager = require('./dbmanager.js');
const enums = require('./enums.js');
const cookie = require('cookie');


/**
 * ServerManager - zarzadzanie zalogowanymi uzytkownikami,
 * korzystamy tutaj z socket io. Ono ma taka wade, ze dla
 * kazdego odswiezenia strony robi NOWE gniazdo
 * 
 * Na serwerze trzymamy uzytkownikow typu OnlinePlayer
 * Przy kazdym requescie socket.io (connection / disconnection)
 * chwytamy ciastko autentykacyjne i wyciagamy z niego info dot.
 * tego, kto sie podlacza.
 * 
 * Jesli ktos zrobi disconnect, to ustawiamy na 30 sekund wywolanie
 * funkcji, ktora go wyczysci z listy aktywnych uzytkownikow.
 * 
 * Jesli polaczy sie na nowo (np zrobi refresh), to szukamy go
 * na liscie aktywnych uzytkownikow i PODMIENIAMY activeSocketId
 * 
 */



var activity = {
    NONE: "",
    PLAYING: "PLAYING",             // actual playing
    INLOBBY: "INLOBBY",             // connected
    WAITING: "WAITING",             // in waiting room
    DISCONNECTED: "DISCONNECTED"    // lost connection ( socket.on('disconnet') )
}


var waitingRoom; // array of OnlinePlayer objects
var connectedUsers; // array of OnlinePlayer objects
var games; // array of Game objects

var io;

/**
 * @returns {string} html string to paste (for client)
 */
function getConnectedUsersHtml() {

    var html = "<div>\r\n"

    if (connectedUsers == null) {
        return "";
    }

    var usersCnt = 0;
    for (let i=0; i<connectedUsers.length; i++) {
        if (connectedUsers[i] != null) {
            usersCnt++;
            html += `  <div>${usersCnt}. ${connectedUsers[i].toString()}</div>\r\n`;
        }
    }

    html += "</div>";

    return html;
}

class OnlinePlayer {

    constructor(activeSocketId,loggedIn,name) {
        this.activeSocketId = activeSocketId; // id to send data
        this.loggedIn = loggedIn;
        this.name = name;
        this.activity = activity.NONE; // what is doing? NONE | PLAYING | INLOBBY | WAITING | DISCONNECTED
        this.onDeleteFunction = null; // pointer to invoking function (deletePlayer)
    }

    toString() {
        var res = this.name;
        if (!this.loggedIn) res += ' (nz)';
        res += ' ' + this.activity;
        return res;
    }
}

/**
 * Emits event only to one given player.
 * @param {OnlinePlayer} onlinePlayer 
 * @param {string} eventName 
 * @param  {...any} args 
 */
function emitToPlayer(onlinePlayer,eventName,...args) {
    io.to(`${onlinePlayer.activeSocketId}`).emit(eventName, ...args);
}

/**
 * Emits event to both players playing the game.
 * @param {Game} game 
 * @param {string} eventName 
 * @param  {...any} args 
 */
function emitToGame(game,eventName,...args) {
    emitToPlayer(game.player1.onlinePlayer,eventName,...args);
    emitToPlayer(game.player2.onlinePlayer,eventName,...args);
}

/**
 * Emits event to every connected player.
 * @param {string} eventName 
 * @param  {...any} args 
 */
function emitToEveryone(eventName,...args) {
    io.emit(eventName, ...args);
}



/**
 * Sets null to connectedUsers array.
 * @param {OnlinePlayer} player
 * @returns {boolean}
 */
function deleteOnlinePlayer(player) {
    
    for (let i=0; i<connectedUsers.length; i++) {
        if (connectedUsers[i] != null && player == connectedUsers[i]) {
            connectedUsers[i] = null;
            return true;
        }
    }

    updateUsers();
    return false;
}


/**
 * Returns OnlinePlayer from connectedUsers array.
 * @param {string} type
 * @param {string} identifier
 * @returns {OnlinePlayer}
 * @example getOnlinePlayer("ID",7)
 * @example getOnlinePlayer("NAME","TheKetrab")
 */
function getOnlinePlayer(type,identifier) {

    if (type == "ID") {
        for (let p of connectedUsers) {
            if (p != null && p.activeSocketId == identifier)
                return p;
        }
    }

    else if (type == "NAME") {
        for (let p of connectedUsers) {
            if (p != null && p.name == identifier)
                return p;
        }
    }

    return null;

}

/**
 * Returns cookie taken from cookieHeader
 * @param {string} cookieHeader 
 * @param {string} cookieName 
 */
function parseCookie(cookieHeader,cookieName) {
    var cookies = cookie.parse(cookieHeader);
    var cookieStr = sliceSignedCookie(cookies[cookieName]);
    return JSON.parse(cookieStr);
}

function sliceSignedCookie(c) {
    
    let startIndex, endIndex;
    for (let i=0; i<c.length; i++) {
        if (c[i] == '{') startIndex = i;
        if (c[i] == '}') endIndex = i+1;
    }

    return c.substring(startIndex,endIndex);
}

/**
 * Sets null to games array.
 * @param {Game} game 
 */
function deleteGame(game) {
    
    for (let i=0; i<games.length; i++) {
        if (games[i] != null && games[i] == game) {
            games[i] = null;
        }
    }
}

/**
 * @returns {string} html string with info about actual games (for client)
 */
function getGamesHtml() {

    var html = "<div>\r\n"

    var gamesCnt = 0;
    for (let i=0; i<games.length; i++) {
        if (games[i] != null) {
            gamesCnt++;
            html += `  <div>${gamesCnt}. ${games[i].toString()}</div>\r\n`;
        }
    }

    html += "</div>";
    return html;
}

/**
 * @returns {string} html string with info about players in waiting room (for client)
 */
function getWaitingUsersHtml() {

    var html = "<div>\r\n"
    for (let i=0; i<waitingRoom.length; i++) {
        html += `  <div>${i+1}. ${waitingRoom[i].name}</div>\r\n`;
    }

    html += "</div>";
    return html;
}

function updateUsers() {

    var x = getConnectedUsersHtml();
    var y = getWaitingUsersHtml();
    var z = getGamesHtml();
    emitToEveryone('updateUsers',x,y,z);
}


/**
 * Takes info about the player from database.
 * @param {OnlinePlayer} onlinePlayer 
 */
async function updateStats(onlinePlayer) {
    if (onlinePlayer.loggedIn) {
        var userInfo = await dbManager.getUserInfo(onlinePlayer.name);
        var htmlData = "<div>\r\n";
        htmlData += `  <div>Rozegrane partie: ${userInfo.n}</div>\r\n`;
        htmlData += `  <div>Wygrane: ${userInfo.wins}</div>\r\n`;
        htmlData += `  <div>Przegrane: ${userInfo.lost}</div>\r\n`;
        htmlData += `  <div>Remisy: ${userInfo.draws}</div>\r\n`;
        htmlData += "</div>"
        emitToPlayer(onlinePlayer,'updateStats',htmlData);
    }
}

function init(server) {

    // ----- EXIT IF -----
    if (!dbManager.isActive()) {
        console.log("dbManager is not active! Run dbManager before running init server manager.");
        return;
    }

    // ----- INIT -----
    games = [];
    connectedUsers = [];
    waitingRoom = [];

    io = socket(server);
    io.on('connection', function(socket) {

        var cookie = parseCookie(socket.handshake.headers.cookie,'authentication');
        var player = getOnlinePlayer("NAME",cookie.username);
        
        // if the user is already connected, cancel invoking
        // 'onDelete' function and change id of socket
        if (player != null) {
            if (player.onDeleteFunction != null) {
                clearTimeout(player.onDeleteFunction);
            }
            player.activeSocketId = socket.id;
            player.activity = activity.INLOBBY; // TODO a co jesli przed rozlaczeniem gracz byl w jakiejs grze ?! ?! ?!
            // TODO a co jesli byl w poczekalni? trzeba go wywalic
            console.log(player.name + ' changed ID to: ' + player.activeSocketId);
        } else { // add new online player
            player = new OnlinePlayer(socket.id,cookie.logged,cookie.username);
            connectedUsers.push( player );
            player.activity = activity.INLOBBY;
            updateStats(player);
            console.log(player.name + ' connected on ID: ' + player.activeSocketId);
        }

        updateUsers();
        handleRequests(socket); 
    });
}

async function closeGame(game,reasonArg) {
    
    game.isActive = false;

    emitToGame(game,'closeGame',reasonArg);

    game.player1.onlinePlayer.activity = activity.INLOBBY;
    game.player2.onlinePlayer.activity = activity.INLOBBY;

    await dbManager.saveGame(game,reasonArg);
    await updateStats(game.player1.onlinePlayer);
    await updateStats(game.player2.onlinePlayer);

    deleteGame(game);
    updateUsers();
    
}

function addPlayerToWaitingRoom(player) {

    // is player already in?
    if (player.activity == activity.WAITING)
        return;

    // add
    waitingRoom.push(player);
    player.activity = activity.WAITING;

    // take two players and start a new game
    if (waitingRoom.length >= 2) {
        var player1 = waitingRoom.shift();
        var player2 = waitingRoom.shift();

        player1.activity = activity.PLAYING;
        player2.activity = activity.PLAYING;

        var game = new Game(player1,player2);
        games.push(game);
    }

    updateUsers();
    
}
    
function getGameOfPlayer(player) {

    for (let g of games) {
        if (g != null) {
            if (g.player1.onlinePlayer == player || g.player2.onlinePlayer == player)
                return g;
        }
    }

    return null;
}

function handleRequests(socket) {

    var player = getOnlinePlayer("ID",socket.id);

    socket.on('disconnect', function() {
        player.activity = activity.DISCONNECTED;
        player.onDeleteFunction = setTimeout(function() { 
            deleteOnlinePlayer(player) 
            console.log(player.name + ' disconnected');
        },30000); // 30 seconds for reconnection
        updateUsers();
    });

    socket.on('startRequest', function (data) {
        addPlayerToWaitingRoom(player);
        updateUsers();
    });

    socket.on('changePromotion', function (type) {
        var game = getGameOfPlayer(player);
        if (game == null) {
            // TODO exception ??
            return;
        }
        var gamePlayer = game.getGamePlayer(player);
        gamePlayer.promotion = type;
    });

    // one player from a game wants a draw TODO
    socket.on('drawRequest', function (data) {

        // EXIT IF
        var game = getGameOfPlayer(player);
        if (game == null) {
            return;
        }

        if (!game.isActive) {
            return;
        }

        // FUNC
        var otherGamePlayer = game.playerWithDifferentID(player.id);
        emitToPlayer(otherGamePlayer.onlinePlayer,'drawOffer',true);

    });

    socket.on('drawResponse', async function (response) { // TODO
        if (response) {
            console.log("REMIS ZA POROZUMIENIEM STRON");
            // TODO ! jaka gra? game=undefined
            await closeGame(game,enums.reason.USERSDRAW);
        } else {
            console.log("ODRZUCONO REMIS");
        }

    });


    // ***** ***** MOVE REQUEST ***** *****
    socket.on('moveRequest', async function (chessmanID, col, row) {

        var game = getGameOfPlayer(player);
        if (game == null) {
            // TODO exception ??
            return;
        }

        if (!game.isActive) {
            emitToPlayer(player,'moveRejected', "Game is overed!");
            return;
        }

        var gamePlayer = game.getGamePlayer(player);
        if (game.actualPlayer != gamePlayer) {
            emitToPlayer(player,'moveRejected', "It is not your turn!");
            return;
        }

        var chm = game.chessmanWithId(chessmanID);
        if (chm == null) {
            emitToPlayer(player,'moveRejected', "Chessman does not exists.");
            return;
        }
        if (chm.color != gamePlayer.color) {
            emitToPlayer(player,'moveRejected', "You cannot move your opponent's chessman.");
            return;
        }

        var madeMove = `${chm.name}[${String.fromCharCode(chm.row + 96)}${chm.col}]`;
        let [res, chmToKill] = chm.canMove(game, col, row);

        // if move is allowed
        if (res == true) {

            // ----- ----- ----- ----- -----
            // may the move is allowed, but it must be cancelled, if the king is checked!
            var moveDone;
            if (chmToKill != null) {
                // if you kill a chessman, will you be no longer checked?
                let index = game.indexOfChessmen(chmToKill.id);
                game.chessmen[index] = null;
                moveDone = chm.move(game, col, row);
                game.chessmen[index] = chmToKill;
            } else {
                moveDone = chm.move(game, col, row);
            }

            if (moveDone == false) {
                emitToPlayer(player,'moveRejected', "You cannot make a move, that will checked your king.");
                return;
            }
            // ----- ----- ----- ----- -----

            madeMove += ` &rarr; [${String.fromCharCode(row + 96)}${col}]`;
            if (chmToKill != null) {
                madeMove += " +";
                game.capture(chmToKill);
            }


            game.numberOfMoves++;
            game.moves.push(madeMove);
            game.switchActualPlayer();
            emitToGame(game,'updateChessboard', game.chessmen, '(' + Math.ceil(game.numberOfMoves / 2) + ')' + madeMove);

            // IS CHECK ?
            var isCheck = game.isCheck(game.actualPlayer.color);
            if (isCheck) {

                // IS CHECKMATE?
                if (game.isCheckmate(game.actualPlayer.color, isCheck)) {
                    console.log("CHECKMATE");
                    emitToGame(game,'checkmate');

                    // who wins?
                    if (game.actualPlayer.color == enums.color.WHITE) {
                        await closeGame(game,enums.reason.CHECKMATE_BLACK);
                    } else {
                        await closeGame(game,enums.reason.CHECKMATE_WHITE);
                    }

                } else {
                    console.log("CHECK");
                    emitToGame(game,'check');
                }
            } else {

                // IS DEAD POSITION?
                if (game.isDeadPosition()) {
                    console.log("DEAD POSITION DRAW");
                    await closeGame(game,enums.reason.DEADPOSITION);
                    emitToGame(game,'deadposition');


                }

                // IS STALEMATE?
                if (game.isStalemate(game.actualPlayer.color, isCheck)) {
                    console.log("STALEMATE");
                    await closeGame(game,enums.reason.STALEMATE);
                    emitToGame(game,'stalemate');
                }

                // IS TRIPPLE DRAW?
                var n = game.moves.length;
                if ((n > 6)
                    && (game.moves[n - 1] == game.moves[n - 3])
                    && (game.moves[n - 3] == game.moves[n - 5])
                    && (game.moves[n - 2] == game.moves[n - 4])
                    && (game.moves[n - 4] == game.moves[n - 6])) {
                    console.log("TRIPPLE DRAW");
                    await closeGame(game,enums.reason.TRIPPLEDRAW);
                    emitToGame(game,'trippledraw');

                }

            }


        } else {
            emitToPlayer(player,'moveRejected',"Invalid move.");
        }

    });


};



module.exports = { OnlinePlayer, init, addPlayerToWaitingRoom, closeGame, getGameOfPlayer, emitToPlayer, emitToGame, emitToEveryone };