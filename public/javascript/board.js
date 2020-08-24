

var gameActive = false; // is player playing any game?

window.addEventListener('resize', resizeCanvas, false);
function resizeCanvas() {
    var canvas = document.getElementById('myCanvas');
    var parent = document.getElementById('canvas-div');

    let a = parent.clientHeight < parent.clientWidth
        ? parent.clientHeight : parent.clientWidth;

    canvas.height = a - 1;
    canvas.width = a - 1;

    if (gameActive) repaintBoard();
}


/**
 * BOARD
 * > draw methods
 * > handle click events
 */


// dimensions
function getBoardSize() { 
    var c = document.getElementById("myCanvas");
    //c.width = 256;
    //c.height = 256;
//    let res = c.width;
//    debugger;
    return c.width;

};
function getCellSize() { return getBoardSize() / 8; }
function getTextSize() { return getBoardSize() / 25; }

// enum
const color = { WHITE: 0, BLACK: 1 };

// global
var actualSelected;
var chessmen; // actual state
var socket = io();
var canvas;

var playerColor;



function init() {

    chessmenPng = document.getElementById('chessmenPng');
    boardPng = document.getElementById('boardPng');
    framePng = document.getElementById('framePng');
    canvas = document.getElementById('myCanvas');
    
    canvas.addEventListener('mousedown', handleClick);
    actualSelected = null;
    resizeCanvas();

}

// draw concrete chessman on board
function draw(ctx,chm) {

    let cellSize = getCellSize();
    var sy = chm.color * 64;
    var sx = chm.type * 64;
    var dx, dy;

    if (playerColor == color.BLACK) {
        dx = (-(chm.col-1)+7)*cellSize;
        dy = (chm.row-1)*cellSize;
    } else {
        dx = (chm.col-1)*cellSize;
        dy = (-(chm.row-1) + 7)*cellSize;
    }

    ctx.drawImage(chessmenPng,
        sx,sy,64,64,
        dx,dy,cellSize,cellSize);
}

// draws board, chessmen and text
function repaintBoard() {
        
    let boardSize = getBoardSize();
    var ctx = canvas.getContext('2d');
    //ctx.canvas.width = 256;
    //ctx.canvas.height = 256;
    ctx.drawImage(boardPng,
        0,0,512,512,                // source
        0,0,boardSize,boardSize);   // destination

    for (let chm of chessmen) {
        if (chm != null)
            draw(ctx,chm);
    }

    if (actualSelected != null)
        drawSelection(actualSelected);

    renderText(ctx);

}

// draws labels (1 2 ... 8, a b ... h)
function renderText(context) {
    
    let cellSize = getCellSize();
    let textSize = getTextSize();
    
    // textMargin (inside cell)
    let leftMargin = textSize / 4;
    let topMargin = textSize;
    let rightMargin = 3*textSize / 4;
    let bottomMargin = textSize / 4;

    context.font = `${textSize}px Arial`;

    if (playerColor == color.BLACK) {
        for (let i=0; i<8; i++) // numbers (vertical)
            context.strokeText(i+1, leftMargin, (i*cellSize)+topMargin);
        for (let i=0; i<8; i++) // letters (horizontal)
            context.strokeText(String.fromCharCode(97+(-i+7)),
                (cellSize*(i+1))-rightMargin,(8*cellSize)-bottomMargin);
    }

    if (playerColor == color.WHITE) {
        for (let i=0; i<8; i++) // numbers (vertical: reversed)
            context.strokeText(-i+8, leftMargin, (i*cellSize)+topMargin);        
        for (let i=0; i<8; i++) // letters (horizontal: reversed)
            context.strokeText(String.fromCharCode(97+i),
                (cellSize*(i+1))-rightMargin,(8*cellSize)-bottomMargin);
    }
    
}

// returns chessman from concrete position
function chessmanAtPos(chessmen,col,row) {

    for (let chm of chessmen) {
        if (chm != null && chm.col == col && chm.row == row)
            return chm;
    }

    return null;
}

function handleClick(e) {

    let [x,y] = getCursorPosition(canvas,e);
    let [col,row] = cursorPositionToCoords(x,y);

    if (playerColor == color.WHITE) {
        row = -row + 9;
    }

    if (playerColor == color.BLACK) {
        col = -col + 9;
    }

    var chm = chessmanAtPos(chessmen,col,row);

    if (actualSelected == null) {
        if (chm != null) {
            actualSelected = chm;
            repaintBoard();
        }
    }
    
    else {
        if (chm != null && chm.color == playerColor) {
            actualSelected = chm;
            repaintBoard();
        } else {
            debugger;
            socket.emit('moveRequest',actualSelected.id,col,row);
            console.log("done")
            actualSelected = null;
        }
    }
}


function cursorPositionToCoords(x,y) {
    let cellSize = getCellSize();
    const col = Math.floor(x/cellSize) + 1;
    const row = Math.floor(y/cellSize) + 1;
    return [col,row];
}

function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return [x,y];
}

// draws gold frame over selected area
function drawSelection(chm) {
    var context = canvas.getContext('2d');
    context.globalAlpha = 0.5;

    let cellSize = getCellSize();
    var dx; var dy;
    if (playerColor == color.BLACK) {
        dx = (-(chm.col-1)+7) * cellSize;
        dy = (chm.row-1)      * cellSize;
    } else {
        dx = (chm.col-1)        * cellSize;
        dy = (-(chm.row-1) + 7) * cellSize;
    }

    context.drawImage(framePng,
        0,0,64,64,
        dx,dy,cellSize,cellSize);
    
    context.globalAlpha = 1;
}