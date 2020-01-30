const http = require('http');
const dbmanager = require('./dbmanager.js');

const crypto = require('crypto');
const iterations = 1000;
const keylen = 32;
const digest = 'sha256';
const encoding = 'base64';
const salt = Buffer.from("O1y5mTgDgCad9bdKSn7b",encoding);

/**
*
* @param {http.IncomingMessage} req
* @param {http.ServerResponse} res
* @param {*} next
*/
function authorize(req, res, next) {
    if ( req.signedCookies['authentication'] ) {
        next();
    } else {
       res.redirect('/');
    }
}

function pbkdf2Async(password, salt, iterations, keylen, digest) {
    return new Promise( (res, rej) => {
        crypto.pbkdf2(password, salt, iterations, keylen, digest, (err, derivedKey) => {
            err ? rej(err) : res(derivedKey);
        });
    });
}

/**
*
* @param {string} username
* @param {string} password
*/
async function validateUser(username, password) {

    var hashFromDatabase = await dbmanager.getHashForUser(username);
    var bPassword = Buffer.from(password,encoding);

    var derivedKey = await pbkdf2Async(bPassword,salt,iterations,keylen,digest);
    var hash = derivedKey.toString(encoding);

    if (hash == hashFromDatabase) {
        return true;
    } else {
        return false;
    }
};

// returns true is user added successfully
// false if there is an error or user already exists
/**
*
* @param {string} username
* @param {string} password
*/
async function addUser(username,password) {
    
    var bPassword = Buffer.from(password,encoding);

    crypto.pbkdf2(bPassword,salt,iterations,keylen,digest, async (err,derivedKey) => {
        var hash = derivedKey.toString(encoding);
        var success = await dbmanager.addUser(username,hash);
        if (success) {
            console.log("User added: " + username);
            return true;
        }

        return false;
    })


}


module.exports = { authorize, validateUser, addUser };