const { King, Queen, Bishop, Knight, Rook, Pawn  } = require('./chessmen.js')
const { type, color } = require('./enums.js');


class GamePlayer {

    constructor(onlinePlayer,color) {
        this.onlinePlayer = onlinePlayer;
        this.color = color;
        this.points = 0; // punkty za zbite figury
        this.promotion = type.QUEEN;
    }

}

class Game {

    constructor(io,onlinePlayer1,onlinePlayer2) {

        this.chessmen = initChessmen();
        this.board = initChessBoard();
        this.moves = [];

        let color1, color2;
        if (Math.floor(Math.random() * 2)) {
            color1 = color.WHITE;
            color2 = color.BLACK;
        } else {
            color1 = color.BLACK;
            color2 = color.WHITE;
        }

        // -- CREATE PLAYERS --
        this.player1 = new GamePlayer(onlinePlayer1,color1);
        this.player2 = new GamePlayer(onlinePlayer2,color2);

        // -- SET ACTUAL PLAYER --
        if (color1 == color.WHITE) {
            this.actualPlayer = this.player1;
        } else {
            this.actualPlayer = this.player2;
        }

        this.isActive = true;
        this.numberOfMoves = 0;

        io.to(onlinePlayer1.activeSocketId).emit( 'startGame', color1 );
        io.to(onlinePlayer2.activeSocketId).emit( 'startGame', color2 );

        io.to(onlinePlayer1.activeSocketId).emit( 'updateChessboard', this.chessmen );
        io.to(onlinePlayer2.activeSocketId).emit( 'updateChessboard', this.chessmen );
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

        if (colorOfKing == color.WHITE)
            king = this.chessmanWithId(16); // white king
        else if (colorOfKing == color.BLACK)
            king = this.chessmanWithId(32); // black king
        else
            return false;

        for (let chm of this.validChessmen()) {
            if (chm.color != colorOfKing) {

                // jesli wroga figura moze sie ruszyc na dane pole, to je atakuje
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

        // wyprobuj wszystkie mozliwe posuniecia i sprawdz czy jest dalej szach
        for (let chm of this.validChessmen()) {
            if (chm.color == kingColor) {

                for (let i=1; i<=8; i++) {
                    for (let j=1; j<=8; j++) {

                        // wyprobuj wszystkie posuniecia dla tej figury
                        let [res,chmToKill] = chm.canMove(this,i,j,false);
                        if (res == true) {

                            var prevRow = chm.row;
                            var prevCol = chm.col;

                            // figura moze sie ruszyc na puste pole
                            if (chmToKill == null) {
                                chm.teleport(this,i,j);
                                if (this.isCheck(kingColor)) {
                                    // cofnij ruch
                                    chm.teleport(this,prevCol,prevRow);
                                } else {
                                    // cofnij ruch
                                    chm.teleport(this,prevCol,prevRow);
                                    return false; // THIS IS NOT CHECKMATE !!!
                                }
                            }
                            
                            // figura moze sie ruszyc na wrogie pole zabijajac
                            else {
                                let index = this.indexOfChessmen(chmToKill.id);
                                this.chessmen[index] = null;
                                chm.teleport(this,i,j);
                                if (this.isCheck(kingColor)) {
                                    // cofnij ruch
                                    this.chessmen[index] = chmToKill;
                                    chm.teleport(this,prevCol,prevRow);
                                } else {
                                    // cofnij ruch
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

        // wyprobuj wszystkie posuniecia, jesli nie ma ruchu, to jest pat
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


    isDeadPosition() { // pat

        // zadna ze stron nie ma materialu na danie mata

        // WHITE
        if ((this.hasChessman(color.WHITE,type.PAWN) >= 1)   // promocja
         || (this.hasChessman(color.WHITE,type.ROOK) >= 1)   // wieza
         || (this.hasChessman(color.WHITE,type.QUEEN) >= 1)  // hetman
         || (this.hasChessman(color.WHITE,type.BISHOP) >= 2) // dwa gonce
         || (                                                // goniec i skoczek
            (this.hasChessman(color.WHITE,type.BISHOP) >= 1)
            && (this.hasChessman(color.WHITE,type.KNIGHT) >= 1)
         ))
        {
            return false;
        }

        // BLACK
        if ((this.hasChessman(color.BLACK,type.PAWN) >= 1)   // promocja
         || (this.hasChessman(color.BLACK,type.ROOK) >= 1)   // wieza
         || (this.hasChessman(color.BLACK,type.QUEEN) >= 1)  // hetman
         || (this.hasChessman(color.BLACK,type.BISHOP) >= 2) // dwa gonce
         || (                                                // goniec i skoczek
            (this.hasChessman(color.BLACK,type.BISHOP) >= 1)
            && (this.hasChessman(color.BLACK,type.KNIGHT) >= 1)
         ))
        {
            return false;
        }

        return true;
    }

    // generator
    // lista jest z dziurami, wiec odfiltrowujemy nulle
    * validChessmen() {
        for (let chm of this.chessmen) {
            if (chm != null) yield chm;
        }
    }

    // BIERZE ID A NIE FIGURE !!!
    indexOfChessmen(chessmanID) {
        for (let i=0; i<this.chessmen.length; i++) {
            if ((this.chessmen[i] != null) 
             && (this.chessmen[i].id == chessmanID))
                return i;
        }
        return null;
    }

    chessmanWithId(id) {

        for (let chm of this.validChessmen()) {
            if (chm.id == id)
                return chm;
        }

        return null;
    }

    chessmanAtPos(col,row) {

        for (let chm of this.validChessmen()) {
            if (chm.col == col && chm.row == row)
                return chm;
        }

        return null;
    }

    

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
        // TODO !!!
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
        chessmen.push(new Pawn(i,i,2,color.WHITE));
    }
    
    chessmen.push(new Knight(9,2,1,color.WHITE));
    chessmen.push(new Knight(10,7,1,color.WHITE));
    chessmen.push(new Bishop(11,3,1,color.WHITE));
    chessmen.push(new Bishop(12,6,1,color.WHITE));
    chessmen.push(new Rook(13,1,1,color.WHITE));
    chessmen.push(new Rook(14,8,1,color.WHITE));
    chessmen.push(new Queen(15,4,1,color.WHITE));
    chessmen.push(new King(16,5,1,color.WHITE));

    // BLACK    
    for (let i = 17; i <= 24; i++) {
        chessmen.push(new Pawn(i,i-16,7,color.BLACK));
    }
    
    chessmen.push(new Knight(25,2,8,color.BLACK));
    chessmen.push(new Knight(26,7,8,color.BLACK));
    chessmen.push(new Bishop(27,3,8,color.BLACK));
    chessmen.push(new Bishop(28,6,8,color.BLACK));
    chessmen.push(new Rook(29,1,8,color.BLACK));
    chessmen.push(new Rook(30,8,8,color.BLACK));
    chessmen.push(new Queen(31,4,8,color.BLACK));
    chessmen.push(new King(32,5,8,color.BLACK));

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
