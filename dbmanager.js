var mssql = require('mssql');
var enums = require('./enums.js');

var connection;
const UNLOGGED = "Niezalogowany";
var dbMode;
var activated = false;


// w jaki jest serwer bazy danych
var mode = {
    NONE: "", // niepolaczony
    DISABLED: "DISABLED", // tryb bez bazy danych
    MSSQL: "MSSQL", // mssql server
    POSTGRESQL: "POSTGRESQL" // postgres
}


function isActive() {
    
    return activated;
}

async function connectToDatabase(dbManagerMode) {

    dbMode = dbManagerMode;
    activated = true;

    if (dbMode == mode.DISABLED) {
        return;
    }

    // ***** ***** *****
    // INFO
    //
    // Zeby sie polaczyc, nalezy:
    // 1. Upewnic sie ze jest wlaczone w Sql Server Configuration Manager:
    //  > Protocols / Shared Memory
    //  > Protocols / Named Pipes
    //  > Protocols / TCP/IP
    //        >> TCP/IP dziala na porcie 1433
    // 2. Server Properties / Security / SQL Server and Windows Authentication mode
    // 3. Uzytkownik musi byc dostepny -> Security / Logins / [User] / Status / Login Enabled
    // 4. Restart server (w SSCM prawy przycisk myszki na SQL Server MSSQLSERVER i 'Restart')
    // 5. To, ze jest 15 kropek (gwiazdek) w hasle, nie znaczy, ze haslo ma 15 znakow!
    // ***** ***** *****

    if (connection && connection.connected) {
        console.log( "Trying to reconnect to database." );
        return;
    }

    var config = {
        user: 'sa',
        password: 'password123',
        server: 'localhost', 
        database: 'WEPPO_CHESS' 
    };

    connection = new mssql.ConnectionPool(config);

    try {
        await connection.connect();
        console.log("Connected to database in mode: " + dbMode);
    }
    catch (err) {
        console.log(err);
    }

}

async function getHashForUser(username) {
    try {
        var req = new mssql.Request( connection );
        req.input('username',username); 
        var res = await req.query(
            'select Hash from Users where Name=@username'
        );
            
        var h = res.recordset[0];

        return h.Hash;
    }
    catch ( err ) {
        console.log( err );
        return [];
    }

}

// returns true if success
// false if user is in db
async function addUser(username,hash) {

    // EXIT IF
    if (dbMode == mode.DISABLED) {
        return;
    }

    try {

        var req1 = new mssql.Request( connection );
        req1.input('username',username)
        var res1 = await req1.query(
            'select * from Users where Name=@username'
        );

        // ----- EXIT IF
        if (res1.recordset.length >= 1) {
            console.log("W bazie juz jest user " + username)
            return false;
        }


        // ----- ADD
        var req2 = new mssql.Request( connection );
        req2.input('username',username);
        req2.input('hash',hash);
        var res2 = await req2.query(
            'insert into Users (Name, Hash) values (@username, @hash)'
        );
            
        return true;
    }
    catch ( err ) {
        console.log( err );
        return [];
    }
}

async function saveGame(game,reasonArg) {

    // ----- EXIT IF
    if (dbMode == mode.DISABLED) {
        return;
    }

    try {

        var winnerOfTheGame = 
            (reasonArg === enums.reason.CHECKMATE_WHITE) ? enums.winner.WHITE :
            (reasonArg === enums.reason.CHECKMATE_BLACK) ? enums.winner.BLACK :
            enums.winner.DRAW;

        var whiteGamePlayer = game.getGamePlayerOfColor(enums.color.WHITE);
        var wOp = whiteGamePlayer.onlinePlayer;
        var blackGamePlayer = game.getGamePlayerOfColor(enums.color.BLACK);
        var bOp = blackGamePlayer.onlinePlayer;

        // get players' ID
        var req1 = new mssql.Request( connection );
        var whiteName = (wOp.loggedIn) ? wOp.name : UNLOGGED;
        var blackName = (bOp.loggedIn) ? bOp.name : UNLOGGED;

        req1.input('whiteName',whiteName);
        req1.input('blackName',blackName);

        var res1 = await req1.query('select * from Users where Name=@whiteName');
        var UserWhite_ID = res1.recordset[0].ID;

        var res1 = await req1.query('select * from Users where Name=@blackName');
        var UserBlack_ID = res1.recordset[0].ID;
        // ---------------------------------------------

        var moves = JSON.stringify(game.moves)

        var req2 = new mssql.Request( connection );
        req2.input('UserWhite_ID', UserWhite_ID);
        req2.input('UserBlack_ID', UserBlack_ID);
        req2.input('Winner',winnerOfTheGame);
        req2.input('NumOfMoves',game.numberOfMoves);
        req2.input('Moves',moves);

        var res2 = await req2.query(
            'insert into Games (UserWhite_ID, UserBlack_ID, Winner, NumOfMoves, Moves) ' +
            'values (@UserWhite_ID, @UserBlack_ID, @Winner, @NumOfMoves, @Moves)'
        );
        
        return res2;
    }
    catch ( err ) {
        console.log( err );
        return [];
    }
}

// returns info about user
async function getUserInfo(name) {

    // EXIT IF
    if (dbMode == mode.DISABLED) {
        return { n:0, wins:0, draws:0, lost:0 };
    }

    try {
        var req1 = new mssql.Request( connection );
        req1.input('name', name);
        var res1 = await req1.query( 'select ID from Users where Name=@name' );

        var userID = res1.recordset[0].ID;

        var req2 = new mssql.Request( connection );
        req2.input('userID',userID);
        var res2 = await req2.query( 'select * from Games where UserWhite_ID=@userID or UserBlack_ID=@userID' );

        var userGames = res2.recordset;
        var n = userGames.length;
        var wins = 0;
        var draws = 0;
        var lost = 0;


        for (let i=0; i<n; i++) {
            
            if (userGames[i].Winner == enums.winner.DRAW) {
                draws += 1;
            } else if ((userGames[i].Winner == enums.winner.WHITE)
                    && (userGames[i].UserWhite_ID == userID)) {
                wins += 1;
            } else if ((userGames[i].Winner == enums.winner.BLACK)
                    && (userGames[i].UserBlack_ID == userID)) {
                lost += 1;
            }
        }        
        
        return { n, wins, draws, lost };
    }
    catch ( err ) {
        console.log( err );
        return [];
    }
}



module.exports = { connectToDatabase, getHashForUser, addUser, saveGame, getUserInfo, isActive, mode }