

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
    CHECKMATE_WHITE: 0, // bialy wygral
    CHECKMATE_BLACK: 1, // czarny wygral 
    STALEMATE: 2, // pat
    USERSDRAW: 3, // za porozumieniem
    DEADPOSITION: 4, // brak materialu
    TRIPPLEDRAW: 5 // trzykrotne powtorzenie
}

module.exports = { type, color, winner, reason };