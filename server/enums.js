const color = {
    WHITE: 0,
    BLACK: 1
}

const type = {
    PAWN: 5,
    KNIGHT: 3,
    BISHOP: 2,
    ROOK: 4,
    QUEEN: 1,
    KING: 0
}

const winner = {
    WHITE: 0,
    BLACK: 1,
    DRAW: 2
}

const reason = {
    CHECKMATE_WHITE: 0, // white won
    CHECKMATE_BLACK: 1, // black won
    STALEMATE: 2,       // pat
    USERSDRAW: 3,       // users want a draw
    DEADPOSITION: 4,    // no material to checkmate
    TRIPPLEDRAW: 5      // 
}

module.exports = { type, color, winner, reason };