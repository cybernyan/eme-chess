
const { King, Queen, Bishop, Knight, Rook, Pawn  } = require('./chessmen.js')
const enums = require('./enums.js');

class GamePlayer {

    constructor(onlinePlayer,color) {
        this.onlinePlayer = onlinePlayer;
        this.color = color;
        this.points = 0; // points for killed chessman (TODO)
        this.promotion = enums.type.QUEEN;
    }

}

class Game {

    constructor(onlinePlayer1,onlinePlayer2) {

        this.chessmen = initChessmen();
        this.board = initChessBoard();
        this.moves = [];

        let color1, color2;
        if (Math.floor(Math.random() * 2)) {
            color1 = enums.color.WHITE;
            color2 = enums.color.BLACK;
        } else {
            color1 = enums.color.BLACK;
            color2 = enums.color.WHITE;
        }

        // -- CREATE PLAYERS --
        this.player1 = new GamePlayer(onlinePlayer1,color1);
        this.player2 = new GamePlayer(onlinePlayer2,color2);

        // -- SET ACTUAL PLAYER --
        if (color1 == enums.color.WHITE) {
            this.actualPlayer = this.player1;
        } else {
            this.actualPlayer = this.player2;
        }

        this.isActive = true;
        this.numberOfMoves = 0;

        const sm = require('./servermanager.js'); // TODO - na gore przeniesc, to chyba przez rekurencyjne require pakietow (module exports na gore)
        sm.emitToPlayer(onlinePlayer1,'startGame',color1);
        sm.emitToPlayer(onlinePlayer2,'startGame',color2);

        sm.emitToPlayer(onlinePlayer1,'updateChessboard',this.chessmen);
        sm.emitToPlayer(onlinePlayer2,'updateChessboard',this.chessmen);

    }

    hasChessman(chmColor,chmType) {

        var res = 0;
        for (let chm of this.validChessmen()) {
            if (chm.color == chmColor && chm.type == chmType) {
                res += 1;
            }
        }

        return res;
    }

    printBoard() {
        for (let row of this.board) {
            var str = "[";
            for (let x of row) str += x;
            str += "]";
            console.log(str);
        }
    }

    // returns free id for new chessman
    freeId() {
        var i = 33;
        while (this.chessmanWithId(i) != null) i++;
        return i;
    }

    switchActualPlayer() {
        if (this.actualPlayer == this.player1)
            this.actualPlayer = this.player2;
        else if (this.actualPlayer == this.player2)
            this.actualPlayer = this.player1;
    }

    /**
     * 
     * @returns {GamePlayer} 
     */
    playerWithDifferentID(id) {
        if (this.player1.onlinePlayer.activeSocketId == id) return this.player2;
        if (this.player2.onlinePlayer.activeSocketId == id) return this.player1;
        return null;
    }

    /**
     * @param {string} id 
     * @returns {GamePlayer} 
     */
    playerWithID(id) {
        if (this.player1.onlinePlayer.activeSocketId == id) return this.player1;
        if (this.player2.onlinePlayer.activeSocketId == id) return this.player2;
        return null;
    }

    /**
     * @param {OnlinePlayer} onlinePlayer
     * @returns {GamePlayer} 
     */
    getGamePlayer(onlinePlayer) {
        if (this.player1.onlinePlayer == onlinePlayer) return this.player1;
        if (this.player2.onlinePlayer == onlinePlayer) return this.player2;
        return null;
    }

    getGamePlayerOfColor(color) {
        if (this.player1.color == color) return this.player1;
        if (this.player2.color == color) return this.player2;
        return null;
    }


    isCheck(colorOfKing) {
        
        var king;

        if (colorOfKing == enums.color.WHITE)
            king = this.chessmanWithId(16); // white king
        else if (colorOfKing == enums.color.BLACK)
            king = this.chessmanWithId(32); // black king
        else
            return false;

        for (let chm of this.validChessmen()) {
            if (chm.color != colorOfKing) {

                // if opponent's chessman can move on that square, it attacks the square 
                let [res,chmToKill] = chm.canMove(this,king.col,king.row,false);
                if (res == true && chmToKill == king)
                    return true;
            }
        }

        return false;
    }

    isCheckmate(kingColor,isCheck) {

        if (!isCheck) {
            return false;
        }

        // try to make all possible moves, detect if check is all the time
        for (let chm of this.validChessmen()) {
            if (chm.color == kingColor) {

                for (let i=1; i<=8; i++) {
                    for (let j=1; j<=8; j++) {

                        // try every move for the chessman
                        let [res,chmToKill] = chm.canMove(this,i,j,false);
                        if (res == true) {

                            var prevRow = chm.row;
                            var prevCol = chm.col;

                            // chessman can move on empty square
                            if (chmToKill == null) {
                                chm.teleport(this,i,j);
                                if (this.isCheck(kingColor)) {
                                    // cancel move
                                    chm.teleport(this,prevCol,prevRow);
                                } else {
                                    // cancel move
                                    chm.teleport(this,prevCol,prevRow);
                                    return false; // THIS IS NOT CHECKMATE !!!
                                }
                            }
                            
                            // chessman can move on the square killing other chessman
                            else {
                                let index = this.indexOfChessmen(chmToKill.id);
                                this.chessmen[index] = null;
                                chm.teleport(this,i,j);
                                if (this.isCheck(kingColor)) {
                                    // cancel move
                                    this.chessmen[index] = chmToKill;
                                    chm.teleport(this,prevCol,prevRow);
                                } else {
                                    // cancel move
                                    this.chessmen[index] = chmToKill;
                                    chm.teleport(this,prevCol,prevRow);
                                    return false; // THIS IS NOT CHECKMATE !!!
                                }

                            }


                        }
                    }
                }

            }
        }

        return true; // CHECKMATE !!!

    }

    isStalemate(kingColor,isCheck) { // pat

        if (isCheck) {
            return false;
        }

        // try to make all possible moves, if there is no legal move it is stalemate
        for (let chm of this.validChessmen()) {
            if (chm.color == kingColor) {

                for (let i=1; i<=8; i++) {
                    for (let j=1; j<=8; j++) {

                        let [res,chmToKill] = chm.canMove(this,i,j,false);
                        if (res == true) return false;

                    }
                }


            }
        }

        return true;

    }


    isDeadPosition() {

        // none of players has material to checkmate

        // WHITE
        if ((this.hasChessman(enums.color.WHITE,enums.type.PAWN) >= 1)   // promotion
         || (this.hasChessman(enums.color.WHITE,enums.type.ROOK) >= 1)   // rook
         || (this.hasChessman(enums.color.WHITE,enums.type.QUEEN) >= 1)  // queen
         || (this.hasChessman(enums.color.WHITE,enums.type.BISHOP) >= 2) // 2x bishop
         || (                                                // knight & bishop
            (this.hasChessman(enums.color.WHITE,enums.type.BISHOP) >= 1)
            && (this.hasChessman(enums.color.WHITE,enums.type.KNIGHT) >= 1)
         ))
        {
            return false;
        }

        // BLACK
        if ((this.hasChessman(enums.color.BLACK,enums.type.PAWN) >= 1)   // promotion
         || (this.hasChessman(enums.color.BLACK,enums.type.ROOK) >= 1)   // rook
         || (this.hasChessman(enums.color.BLACK,enums.type.QUEEN) >= 1)  // queen
         || (this.hasChessman(enums.color.BLACK,enums.type.BISHOP) >= 2) // 2x bishop
         || (                                                // knight & bishop
            (this.hasChessman(enums.color.BLACK,enums.type.BISHOP) >= 1)
            && (this.hasChessman(enums.color.BLACK,enums.type.KNIGHT) >= 1)
         ))
        {
            return false;
        }

        return true;
    }

    // generator
    // chessmen array contains nulls, filter for not null
    * validChessmen() {
        for (let chm of this.chessmen) {
            if (chm != null) yield chm;
        }
    }

    /**
     * chessman id -> index in chessmen array
     * @param {number} chessmanID chessman id
     * @returns {number} index in array
     */
    indexOfChessmen(chessmanID) {
        for (let i=0; i<this.chessmen.length; i++) {
            if ((this.chessmen[i] != null) 
             && (this.chessmen[i].id == chessmanID))
                return i;
        }
        return null;
    }

    /** 
     * @param {number} id 
     * @returns {chessmen.Chessman}
     */
    chessmanWithId(id) {

        for (let chm of this.validChessmen()) {
            if (chm.id == id)
                return chm;
        }

        return null;
    }

    /**
     * @param {number} col 
     * @param {number} row 
     * @returns {chessmen.Chessman}
     */
    chessmanAtPos(col,row) {

        for (let chm of this.validChessmen()) {
            if (chm.col == col && chm.row == row)
                return chm;
        }

        return null;
    }

    /**
     * set null to index in chessmen array
     * @param {chessmen.Chessman} chm 
     */
    deleteChessman(chm) {
        
        for (let i=0; i<this.chessmen.length; i++) {
            if ((this.chessmen[i] != null) 
             && (this.chessmen[i] == chm)) {

                this.chessmen[i] = null;
                return true;

             } 
        }
    }

    capture(chm) {
        // TODO -> add points
        this.deleteChessman(chm);
    }

    toString() {
        return `${this.player1.onlinePlayer.name} vs ${this.player2.onlinePlayer.name}`;
    }
}

function initChessmen() {

    var chessmen = [];

    // WHITE    
    for (let i = 1; i <= 8; i++) {
        chessmen.push(new Pawn(i,i,2,enums.color.WHITE));
    }
    
    chessmen.push(new Knight(9,2,1,enums.color.WHITE));
    chessmen.push(new Knight(10,7,1,enums.color.WHITE));
    chessmen.push(new Bishop(11,3,1,enums.color.WHITE));
    chessmen.push(new Bishop(12,6,1,enums.color.WHITE));
    chessmen.push(new Rook(13,1,1,enums.color.WHITE));
    chessmen.push(new Rook(14,8,1,enums.color.WHITE));
    chessmen.push(new Queen(15,4,1,enums.color.WHITE));
    chessmen.push(new King(16,5,1,enums.color.WHITE));

    // BLACK    
    for (let i = 17; i <= 24; i++) {
        chessmen.push(new Pawn(i,i-16,7,enums.color.BLACK));
    }
    
    chessmen.push(new Knight(25,2,8,enums.color.BLACK));
    chessmen.push(new Knight(26,7,8,enums.color.BLACK));
    chessmen.push(new Bishop(27,3,8,enums.color.BLACK));
    chessmen.push(new Bishop(28,6,8,enums.color.BLACK));
    chessmen.push(new Rook(29,1,8,enums.color.BLACK));
    chessmen.push(new Rook(30,8,8,enums.color.BLACK));
    chessmen.push(new Queen(31,4,8,enums.color.BLACK));
    chessmen.push(new King(32,5,8,enums.color.BLACK));

    return chessmen;
}


function initChessBoard() {

    return [
        [  0,  0,  0,  0,  0,  0,  0,  0,  0  ],
        [  0, 13,  9, 11, 15, 16, 12, 10, 14  ],
        [  0,  1,  2,  3,  4,  5,  6,  7,  8  ],
        [  0,  0,  0,  0,  0,  0,  0,  0,  0  ],
        [  0,  0,  0,  0,  0,  0,  0,  0,  0  ],
        [  0,  0,  0,  0,  0,  0,  0,  0,  0  ],
        [  0,  0,  0,  0,  0,  0,  0,  0,  0  ],
        [  0,  17, 18, 19, 20, 21, 22, 23, 24 ],
        [  0,  29, 25, 27, 31, 32, 28, 26, 30 ]
    ];
};




module.exports = { GamePlayer, Game };
