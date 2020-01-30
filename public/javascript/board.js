

const color = {
    WHITE: 0,
    BLACK: 1
}

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
}

function draw(ctx,chm) {
    var sy = chm.color * 64;
    var sx = chm.type * 64;
    var dx, dy;

    if (playerColor == color.BLACK) {
        dx = (-(chm.col-1)+7)*64;
        dy = (chm.row-1)*64;
    } else {
        dx = (chm.col-1)*64;
        dy = (-(chm.row-1) + 7)*64;
    }

    ctx.drawImage(chessmenPng,sx,sy,64,64,dx,dy,64,64);
}

function repaintBoard() {
        
    var context = canvas.getContext('2d');
    context.drawImage(boardPng,0,0,512,512,0,0,512,512);

    for (let chm of chessmen) {
        if (chm != null)
            draw(context,chm);
    }

    if (actualSelected != null)
        drawSelection(actualSelected);

    renderText(context);

}

function renderText(context) {
    
    context.font = "20px Arial";

    if (playerColor == color.BLACK) {
        for (let i=0; i<8; i++)
            context.strokeText(i+1, 5, (i*64)+20);        
        for (let i=0; i<8; i++)
            context.strokeText(String.fromCharCode(97+(-i+7)),(64*(i+1))-15,(8*64)-5);
    }

    if (playerColor == color.WHITE) {
        for (let i=0; i<8; i++)
            context.strokeText(-i+8, 5, (i*64)+20);        
        for (let i=0; i<8; i++)
            context.strokeText(String.fromCharCode(97+i),(64*(i+1))-15,(8*64)-5);
    }
    
}

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
    const col = Math.floor(x/64) + 1;
    const row = Math.floor(y/64) + 1;
    return [col,row];
}

function getCursorPosition(canvas, event) {
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    return [x,y];
}


function drawSelection(chm) {
    var context = canvas.getContext('2d');
    context.globalAlpha = 0.5;

    var dx; var dy;
    if (playerColor == color.BLACK) {
        dx = (-(chm.col-1)+7)*64;
        dy = (chm.row-1)*64;
    } else {
        dx = (chm.col-1)*64;
        dy = (-(chm.row-1) + 7)*64;
    }

    context.drawImage(framePng,0,0,64,64,dx,dy,64,64);
    context.globalAlpha = 1;
}