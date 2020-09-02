// ----- pkg -----
const http          = require('http');
const express       = require('express');
const mssql         = require('mssql');
const cookieParser  = require('cookie-parser');
const fs            = require('fs');
// ----- custom -----
const dbManager     = require('./dbmanager.js');
const sm            = require('./servermanager.js');
const membership    = require('./membership.js');
const config = require('../config.json');


// ----- globals -----
const secretKey = 'foobarbaz12345';
const app = express();

function configureServer() {

    app.set('view engine', 'ejs');
    app.set('views', './views');
    app.use(express.urlencoded( { extended:true } ));
    app.use(express.static( 'public' ))
    app.use(cookieParser( config.cookieParser.secret ));

    var server = http.createServer(app);

    app.get("/", (req, res) => { 

        var loginError;
        var createError;
        var noRegistrationError;

        res.render('index', { loginError, createError, noRegistrationError } );
    });

    // ***** **** *****
    // ----- GAME -----
    app.get("/game", membership.authorize, (req, res) => {

        var c = req.signedCookies['authentication'];
        var username = c.username;
        //if (!c.logged) username += ' (niezalogowany)';

        res.render("game", { username });

    });

    // ***** *************** *****
    // ----- NO REGISTRATION -----
    app.post("/noRegistration", (req,res) => {
      
        var nickName = req.body.noRegistrationNick;

        var errorMessage = "";
        var success = true;

        if (nickName == "") {
            errorMessage = "Podaj swój nick!";
            success = false;
        }

        // ----- SUCCESS ??? -----
        if (success) {
            var cookieValue = { username: nickName, logged: false };
            res.cookie('authentication', cookieValue, { signed: true });
            res.redirect('/game');
        } else {
            res.render("index", { noRegistrationError: errorMessage })
        }

    });

    // ***** ***** *****
    // ----- LOGIN -----
    app.post("/login", async (req,res) => {
      
        var username = req.body.loginUsername;
        var password = req.body.loginPassword;

        var errorMessage = "";
        var success = true;

        if (username == "" || password == "") {
            errorMessage = "Nazwa użytkownika i hasło nie moga być puste!";
            success = false;
        }

        if (success && !(await membership.validateUser(username,password))) {
            errorMessage = "Niepoprawny login lub hasło.";
            success = false;    
        }

        // ----- SUCCESS ??? -----
        if (success) {
            var cookieValue = { username: username, logged: true };
            res.cookie('authentication', cookieValue, { signed: true });
            res.redirect('/game');
        } else {
            res.render("index", { loginError: errorMessage })
        }

    });

    // ***** ***** *****
    // ----- CREATE -----
    app.post("/create", (req,res) => {
      
        var username = req.body.createUsername;
        var password = req.body.createPassword;
        var repeatPassword = req.body.createRepeatPassword;

        var errorMessage = "";
        var success = true;

        if (username == "" || password == "" || repeatPassword == "") {
            errorMessage = "Żadne z pól nie może być puste.";
            success = false;
        }

        if (password != repeatPassword) {
            errorMessage = "Hasło i powtórz hasło muszą być takie same!";
            success = false;
        }

        if (!membership.addUser(username,password)) {
            errorMessage = "Nie można utworzyć konta użytkownika.";
            success = false;
        }

        // ----- SUCCESS ??? -----
        if (success) {
            var cookieValue = { username: username, logged: true };
            res.cookie('authentication', cookieValue, { signed: true });
            res.redirect('/game');
        } else {
            res.render("index", { createError: errorMessage })
        }

    });

    
    // ***** ****** *****
    // ----- LOGOUT -----
    app.get("/logout", (req, res) => {
        res.cookie('authentication', {}, { maxAge: -1 });
        res.redirect('/');
    });


    // ***** ***** *****
    // -----  404  -----
    app.use((req,res,next) => {
        res.render('404', { url : req.url });
    });

    console.log("Server set up.");
    return server;
}


(async function main() {

    try {
        var server = configureServer();
        server.listen(process.env.PORT || 3000);
        await dbManager.connectToDatabase(dbManager.mode.DISABLED); // nie lacz sie do bazy danych
        //await dbManager.connectToDatabase(dbManager.mode.MSSQL); // connect with MSSQL server
        sm.init(server);

    } catch(err) {

        console.log("Exception caught in main: " + err);

    }

})();
