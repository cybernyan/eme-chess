const enums = require('./enums.js');

/**
 * move(i,j), canMove(i,j)
 */
class Chessman {

    /**
     * @param {number} id
     * @param {number} col
     * @param {number} row
     * @param {type} type
     * @param {color} color
     * @param {string} img
     */
    constructor(id,col,row,type,color) {
        this.id = id;
        this.col = col;
        this.row = row;
        this.type = type;
        this.color = color;
        this.numOfMoves = 0;
    }

    toString() {
        return `${this.name}(${this.id}) [${this.col},${this.row}]`;
    }


    /**
     * returns true if moved successfully (no check after move)
     * @param {Game} game 
     * @param {number} col 
     * @param {number} row 
     * @returns {boolean}
     */
    move(game,col,row) {

        let prevCol = this.col;
        let prevRow = this.row;

        this.teleport(game,col,row);

        if (game.isCheck(this.color)) {
            // move back !
            this.teleport(game,prevCol,prevRow);
            return false;
        }

        this.numOfMoves += 1;
        return true;
    }

    teleport(game,col,row) {
        game.board[this.col][this.row] = 0; // clear
        this.col = col; this.row = row;
        game.board[this.col][this.row] = this.id;
    }

    /**
     * returns an information if chessman can move to (col,row)
     * @param {Game} game 
     * @param {number} col 
     * @param {number} row 
     * @returns {[boolean,Chessman]}
     */
    standardCheck(game,col,row) {
        var chm = game.chessmanAtPos(col,row);
        if (chm == null) return [true,null];                    // free square
        else if (chm.color == this.color) return [false,null];  // your chessman
        else return [true,chm];                                 // opponent -> kill!
    }

    forbiddenMoveLog(col,row) {
        console.log(`Forbidden move of ${this.toString()} -> [${col},${row}]`);
    }


}

class King extends Chessman {

    constructor(id,col,row,color) {
        super(id,col,row,enums.type.KING,color);
    }

    name = "King";

    /** 
     * @param {number} col
     * @param {number} row
     */
    canMove(game,col,row,printLog=true) {

        // normal move or capture
        if ((this.col == col && this.row == row+1)
         || (this.col == col && this.row == row-1)

         || (this.col == col-1 && this.row == row)
         || (this.col == col-1 && this.row == row+1)
         || (this.col == col-1 && this.row == row-1)

         || (this.col == col+1 && this.row == row)
         || (this.col == col+1 && this.row == row+1)
         || (this.col == col+1 && this.row == row-1))
            return this.standardCheck(game,col,row);

        // short castle
        if ((this.col == 5 && col == 7)
         && (this.numOfMoves == 0)
         && (game.isCheck(this.color) == false)) // is the king checked?
        {
            if (this.color == enums.color.WHITE)
                return TryToMakeShortCastle(game,this,14,col,row);
            else if (this.color == enums.color.BLACK)
                return TryToMakeShortCastle(game,this,30,col,row);
        }

        // long castle
        if ((this.col == 5 && col == 3)
         && (this.numOfMoves == 0)
         && (game.isCheck(this.color) == false))
        {
            if (this.color == enums.color.WHITE)
                return TryToMakeLongCastle(game,this,13,col,row);
            else if (this.color == enums.color.BLACK)
                return TryToMakeLongCastle(game,this,29,col,row);
        }


        if (printLog)
            this.forbiddenMoveLog(col,row);

        return [false,null];
    }  
    
}


/**
 * Is it possible to make short castle?
 * @param {Game} game 
 * @param {King} king 
 * @param {number} rookID id of rook (defined in board) 
 * @param {number} destCol 
 * @param {number} destRow 
 * @returns {[Boolean,Chessman]}
 */
function TryToMakeShortCastle(game, king, rookID, destCol, destRow) {

    // if the rook is killed
    if (game.chessmanWithId(rookID) == null) {
        return [false,null];
    }

    if ((game.chessmanWithId(rookID).numOfMoves == 0)
        && (game.chessmanAtPos(destCol - 1, destRow) == null)
        && (game.chessmanAtPos(destCol, destRow) == null)) {

        // col before trying to move
        var prevCol = king.col;
        var prevRow = king.row;

        if (canKingMakeCastle(king, game, destCol-1, destCol)) {
            var rook = game.chessmanWithId(rookID);
            rook.move(game, prevCol + 1, destRow);
            return [true, null];
        } else {
            this.teleport(game, prevCol, prevRow); // cancel
            return [false, null];
        }


    } else {
        return [false, null];
    }
}


/**
 * Is it possible to make long castle?
 * @param {Game} game 
 * @param {King} king 
 * @param {number} rookID id of rook (defined in board) 
 * @param {number} destCol 
 * @param {number} destRow 
 */
function TryToMakeLongCastle(game, king, rookID, destCol, destRow) {

    // if the rook is killed
    if (game.chessmanWithId(rookID) == null) {
        return [false,null];
    }

    if ((game.chessmanWithId(rookID).numOfMoves == 0)
        && (game.chessmanAtPos(destCol + 1, destRow) == null)
        && (game.chessmanAtPos(destCol, destRow) == null)
        && (game.chessmanAtPos(destCol - 1, destRow) == null)) {

        // col before trying to move
        var prevCol = king.col;
        var prevRow = king.row;

        if (canKingMakeCastle(king, game, destCol+1, destCol)) {
            var rook = game.chessmanWithId(rookID);
            rook.move(game, prevCol - 1, destRow);
            return [true, null];
        } else {
            king.teleport(game, prevCol, prevRow); // cancel
            return [false, null];
        }


    } else {
        return [false, null];
    }
}

// check if king is checked when it tries to move
function canKingMakeCastle(chm,game,firstCol,secondCol) {
    var possible = true;
    chm.teleport(game,firstCol,chm.row);
    if (game.isCheck(chm.color)) possible = false;
    chm.teleport(game,secondCol,chm.row);
    if (game.isCheck(chm.color)) possible = false;
    return possible;
}


class Queen extends Chessman {

    constructor(id,col,row,color) {
        super(id,col,row,enums.type.QUEEN,color);
    }

    name="Queen";

    canMove(game,col,row,printLog=true) {

        let [res,chm] = tryToMoveLikeRook(this,game,col,row,printLog);
        if (res == undefined && chm == undefined) {

            let [res,chm] = tryToMoveLikeBishop(this,game,col,row,printLog);
            if (res == undefined && chm == undefined) {
                if (printLog)
                    this.forbiddenMoveLog(col,row);
                return [false,null];    
            } else {
                return [res,chm];
            }

        } else {
            return [res,chm];
        }

    }

}

class Rook extends Chessman {

    constructor(id,col,row,color) {
        super(id,col,row,enums.type.ROOK,color);
    }

    name="Rook";

    canMove(game,col,row,printLog=true) {

        let [res,chm] = tryToMoveLikeRook(this,game,col,row,printLog);

        if (res == undefined && chm == undefined) {
            if (printLog)
                this.forbiddenMoveLog(col,row);
            return [false,null];
        }

        return [res,chm];
    }    

}

class Bishop extends Chessman {

    constructor(id,col,row,color) {
        super(id,col,row,enums.type.BISHOP,color);
    }

    name = "Bishop";
    
    canMove(game,col,row,printLog=true) {

        let [res,chm] = tryToMoveLikeBishop(this,game,col,row,printLog);

        if (res == undefined && chm == undefined) {
            if (printLog)
                this.forbiddenMoveLog(col,row);
            return [false,null];
        }

        return [res,chm];
    }    

}

class Knight extends Chessman {

    constructor(id,col,row,color) {
        super(id,col,row,enums.type.KNIGHT,color);
    }

    name = "Knight";
    
    canMove(game,col,row,printLog=true) {

        // normal move or capture
        if ((this.col == col+1 && this.row == row+2)
         || (this.col == col+1 && this.row == row-2)
         || (this.col == col-1 && this.row == row+2)
         || (this.col == col-1 && this.row == row-2)
         || (this.col == col+2 && this.row == row+1)
         || (this.col == col+2 && this.row == row-1)
         || (this.col == col-2 && this.row == row+1)
         || (this.col == col-2 && this.row == row-1))
            return this.standardCheck(game,col,row);


        if (printLog)
            this.forbiddenMoveLog(col,row);
        return [false,null];
    }

}

class Pawn extends Chessman {

    constructor(id,col,row,color) {
        super(id,col,row,enums.type.PAWN,color);
    }

    name="Pawn";

    move(game,col,row) {
        var res = super.move(game,col,row);
        
        // promotion?
        if ((this.color == enums.color.WHITE && this.row == 8) 
         || (this.color == enums.color.BLACK && this.row == 1))
        {
            var chmToTransform = game.chessmanAtPos(col,row);
            var index = game.indexOfChessmen(chmToTransform.id);
            var playerDecisionType = game.actualPlayer.promotion;

            var newChessman;
            var newId = game.freeId();

            if (playerDecisionType == enums.type.QUEEN) {
                newChessman = new Queen(newId,col,row,chmToTransform.color);
            } else if (playerDecisionType == enums.type.ROOK) {
                newChessman = new Rook(newId,col,row,chmToTransform.color);
            } else if (playerDecisionType == enums.type.KNIGHT) {
                newChessman = new Knight(newId,col,row,chmToTransform.color);
            } else if (playerDecisionType == enums.type.BISHOP) {
                newChessman = new Bishop(newId,col,row,chmToTransform.color);
            } else {
                console.log("Unknown type of chessman...");
                newChessman = new Queen(newId,col,row,chmToTransform.color);
            }

            game.chessmen[index] = newChessman;
        }

        return res;
    }

    canMove(game,col,row,printLog=true) {

        if (this.color == enums.color.WHITE) {

            // 1 normal move
            if (col == this.col && row == this.row+1) {

                // is square free?
                if (game.chessmanAtPos(col,row) == null)
                    return [true,null];
            }

            // 2 huge move at start
            else if (col == this.col && row == this.row+2) {

                // is first move and square free?
                if ((this.numOfMoves == 0)
                 && (game.chessmanAtPos(col,row-1) == null)
                 && (game.chessmanAtPos(col,row) == null))
                     return [true,null];                 
            }


            // 3 capture
            else if ((col == this.col+1 && row == this.row+1)
                  || (col == this.col-1 && row == this.row+1))
            {
                // is there any chessman of oposite color?
                var chm = game.chessmanAtPos(col,row);
                if ((chm != null) && (chm.color != this.color))
                    return [true,chm];

                // ------------------------------------------------------------
                // enpassant

                if (col == this.col+1 && row == this.row+1) {
                    // is next to the pawn opposite pawn which made big move?
                    var chm = game.chessmanAtPos(this.col+1,this.row);
                    if ((chm != null) && (chm.numOfMoves == 1) && (chm.row == 5)
                    && (chm.type == enums.type.PAWN) && (chm.color == enums.color.BLACK))
                        return [true,chm];
                }

                else if (col == this.col-1 && row == this.row+1) {
                    // is next to the pawn opposite pawn which made big move?
                    var chm = game.chessmanAtPos(this.col-1,this.row);
                    if ((chm != null) && (chm.numOfMoves == 1) && (chm.row == 5)
                    && (chm.type == enums.type.PAWN) && (chm.color == enums.color.BLACK))
                        return [true,chm];
                }
            }


            // unknown
            else {
                if (printLog)
                    this.forbiddenMoveLog(game,col,row)
            }

        }

        else if (this.color == enums.color.BLACK) {

            // 1 normal move
            if (col == this.col && row == this.row-1) {

                // is square free?
                if (game.chessmanAtPos(col,row) == null)
                    return [true,null];
            }

            // 2 huge move at start
            else if (col == this.col && row == this.row-2) {

                // is first move and square free?
                if ((this.numOfMoves == 0)
                 && (game.chessmanAtPos(col,row+1) == null)
                 && (game.chessmanAtPos(col,row) == null))
                     return [true,null];
                 
            }


            // 3 capture
            else if ((col == this.col+1 && row == this.row-1)
                  || (col == this.col-1 && row == this.row-1))
            {

                // is there any chessman of oposite color?
                var chm = game.chessmanAtPos(col,row);
                if ((chm != null) && (chm.color != this.color)) {
                    return [true,chm];
                }

                
                // ------------------------------------------------------------
                // enpassant

                if (col == this.col+1 && row == this.row-1) {
                    // is next to the pawn opposite pawn which made big move?
                    var chm = game.chessmanAtPos(this.col+1,this.row);
                    if ((chm != null) && (chm.numOfMoves == 1) && (chm.row == 4)
                    && (chm.type == enums.type.PAWN) && (chm.color == enums.color.WHITE))
                        return [true,chm];
                }

                else if (col == this.col-1 && row == this.row-1) {
                    // is next to the pawn opposite pawn which made big move?
                    var chm = game.chessmanAtPos(this.col-1,this.row);
                    if ((chm != null) && (chm.numOfMoves == 1) && (chm.row == 4)
                    && (chm.type == enums.type.PAWN) && (chm.color == enums.color.WHITE))
                        return [true,chm];
                }

            }


            //unknown
            else {
                if (printLog)
                    this.forbiddenMoveLog(col,row);
            }

        }

        else {
            console.log(`undefined color of pawn with ID ${this.id}`);
        }

        return [false,null];

    }

}


function tryToMoveLikeBishop(thisChessman,game,col,row,printLog=true) {
    
        // normal move or capture
        let dx = col - thisChessman.col;
        let dy = row - thisChessman.row;

        // the same diagonal?
        if (Math.abs(dx) == Math.abs(dy)) {

            // each square between must be free !
            
            // 1 direction: />
            if (dx > 0 && dy > 0) {

                // is any obstacle on the way?
                for (let i=1; i<Math.abs(dx); i++) {
                    if (game.chessmanAtPos(thisChessman.col+i,thisChessman.row+i) != null) {
                        if (printLog)
                            thisChessman.forbiddenMoveLog(col,row);
                        return [false,null];
                    }
                }

                return thisChessman.standardCheck(game,col,row);
            }

            // 2 direction: </
            if (dx < 0 && dy < 0) {

                // is any obstacle on the way?
                for (let i=1; i<Math.abs(dx); i++) {
                    if (game.chessmanAtPos(thisChessman.col-i,thisChessman.row-i) != null) {
                        if (printLog)
                            thisChessman.forbiddenMoveLog(col,row);
                        return [false,null];
                    }
                }

                return thisChessman.standardCheck(game,col,row);
            }


            // 3 direction: <\
            if (dx < 0 && dy > 0) {

                // is any obstacle on the way?
                for (let i=1; i<Math.abs(dx); i++) {
                    if (game.chessmanAtPos(thisChessman.col-i,thisChessman.row+i) != null) {
                        if (printLog)
                            thisChessman.forbiddenMoveLog(col,row);
                        return [false,null];
                    }
                }

                return thisChessman.standardCheck(game,col,row);
            }



            // 4 direction: \>
            if (dx > 0 && dy < 0) {

                // is any obstacle on the way?
                for (let i=1; i<Math.abs(dx); i++) {
                    if (game.chessmanAtPos(thisChessman.col+i,thisChessman.row-i) != null) {
                        if (printLog)
                            thisChessman.forbiddenMoveLog(col,row);
                        return [false,null];
                    }
                }

                return thisChessman.standardCheck(game,col,row);
            }


            // 5 dx = dy = 0
            if (dx == 0) {
                if (printLog)
                    thisChessman.forbiddenMoveLog(col,row);
                return [false,null];
            }

        }

    // it was not move like a bishop...
    return [undefined,undefined];
}

function tryToMoveLikeRook(thisChessman,game,col,row,printLog=true) {

    // normal move or capture
    let dx = col - thisChessman.col;
    let dy = row - thisChessman.row;

    // the same col
    if (dx == 0 && dy != 0) {

        // each square between must be free !
        // is any obstacle on the way?

        if (dy > 0) {

            for (let i=1; i<Math.abs(dy); i++) {
                if (game.chessmanAtPos(thisChessman.col,thisChessman.row+i) != null) {
                    if (printLog)
                        thisChessman.forbiddenMoveLog(col,row);
                    return [false,null];
                }
            }

            return thisChessman.standardCheck(game,col,row);

        }

        else if (dy < 0) {

            for (let i=1; i<Math.abs(dy); i++) {
                if (game.chessmanAtPos(thisChessman.col,thisChessman.row-i) != null) {
                    if (printLog)
                        thisChessman.forbiddenMoveLog(col,row);
                    return [false,null];
                }
            }

            return thisChessman.standardCheck(game,col,row);

        }


    }

    // the same row
    if (dx != 0 && dy == 0) {

        // each square between must be free !
        if (dx > 0) {

            for (let i=1; i<Math.abs(dx); i++) {
                if (game.chessmanAtPos(thisChessman.col+i,thisChessman.row) != null) {
                    if (printLog)
                        thisChessman.forbiddenMoveLog(col,row);
                    return [false,null];
                }
            }

            return thisChessman.standardCheck(game,col,row);


        }

        else if (dx < 0) {

            for (let i=1; i<Math.abs(dx); i++) {
                if (game.chessmanAtPos(thisChessman.col-i,thisChessman.row) != null) {
                    if (printLog)
                        thisChessman.forbiddenMoveLog(col,row);
                    return [false,null];
                }
            }

            return thisChessman.standardCheck(game,col,row);

        }

    }

    // it was not move like a rook...
    return [undefined,undefined];
}



module.exports = { King, Queen, Bishop, Knight, Rook, Pawn  }

