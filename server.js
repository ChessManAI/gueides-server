const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION:', err);
});

const app = express();
const server = http.createServer(app);

app.get('/', (_req, res) => {
    res.send('Gueides server OK');
});

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

const io = new Server(server, {
    cors: {
        origin: [
            'https://wargame.gueides.com',
            'https://www.wargame.gueides.com',
            'http://localhost:3000',
            'http://127.0.0.1:5500'
        ],
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
});

const games = new Map();
const socketToRoom = new Map();

function generateRoomCode() {
    let code;
    do {
        code = Math.random().toString(36).slice(2, 7).toUpperCase();
    } while (games.has(code));
    return code;
}

function getPlayerColor(game, socketId) {
    if (game.players.black === socketId) return 'black';
    if (game.players.white === socketId) return 'white';
    return null;
}

function nextTurn(color) {
    return color === 'black' ? 'white' : 'black';
}

function isValidCoord(n) {
    return Number.isInteger(n) && n >= 0 && n <= 8;
}

function emitRoomState(roomCode) {
    const game = games.get(roomCode);
    if (!game) return;

    io.to(roomCode).emit('roomState', {
        roomCode,
        started: game.started,
        turn: game.turn,
        players: {
            black: Boolean(game.players.black),
            white: Boolean(game.players.white)
        }
    });
}

function closeRoom(roomCode, reason = 'La sala fue cerrada.') {
    const game = games.get(roomCode);
    if (!game) return;

    io.to(roomCode).emit('roomClosed', { roomCode, reason });

    for (const color of ['black', 'white']) {
        const sid = game.players[color];
        if (sid) {
            socketToRoom.delete(sid);
            const sock = io.sockets.sockets.get(sid);
            if (sock) sock.leave(roomCode);
        }
    }

    games.delete(roomCode);
    console.log(`Sala cerrada: ${roomCode} | Motivo: ${reason}`);
}

io.on('connection', (socket) => {
    console.log('Comandante conectado:', socket.id);

    socket.on('createGame', () => {
        const currentRoom = socketToRoom.get(socket.id);
        if (currentRoom) {
            closeRoom(currentRoom, 'La partida anterior fue reemplazada por una nueva.');
        }

        const roomCode = generateRoomCode();

        const game = {
            players: {
                black: socket.id,
                white: null
            },
            turn: 'black',
            started: false,
            moves: []
        };

        games.set(roomCode, game);
        socketToRoom.set(socket.id, roomCode);
        socket.join(roomCode);

        socket.emit('gameCreated', {
            roomCode,
            color: 'black',
            turn: game.turn
        });

        emitRoomState(roomCode);
    });

    socket.on('joinGame', (rawRoomCode) => {
        const roomCode = String(rawRoomCode || '').trim().toUpperCase();
        const game = games.get(roomCode);

        if (!roomCode) {
            socket.emit('serverError', 'Debes escribir un código de sala.');
            return;
        }

        if (!game) {
            socket.emit('serverError', 'La sala no existe.');
            return;
        }

        if (game.started || game.players.white) {
            socket.emit('serverError', 'La sala ya está llena.');
            return;
        }

        game.players.white = socket.id;
        game.started = true;

        socketToRoom.set(socket.id, roomCode);
        socket.join(roomCode);

        socket.emit('gameJoined', {
            roomCode,
            color: 'white',
            turn: game.turn
        });

        io.to(roomCode).emit('gameStarted', {
            message: '¡El oponente se ha unido! Que comience la batalla.',
            turn: game.turn
        });

        emitRoomState(roomCode);
    });

    socket.on('sendMove', (data) => {
        const roomCode = String(data?.roomCode || '').trim().toUpperCase();
        const move = data?.move;
        const promotion = data?.promotion || null;

        const game = games.get(roomCode);
        if (!game) {
            socket.emit('serverError', 'La sala ya no existe.');
            return;
        }

        const myColor = getPlayerColor(game, socket.id);
        if (!myColor) {
            socket.emit('serverError', 'No perteneces a esta sala.');
            return;
        }

        if (!game.started) {
            socket.emit('serverError', 'La partida todavía no ha comenzado.');
            return;
        }

        if (game.turn !== myColor) {
            socket.emit('serverError', 'No es tu turno.');
            return;
        }

        const fr = Number(move?.fr);
        const fc = Number(move?.fc);
        const tr = Number(move?.tr);
        const tc = Number(move?.tc);

        if (![fr, fc, tr, tc].every(isValidCoord)) {
            socket.emit('serverError', 'Movimiento inválido.');
            return;
        }

        game.moves.push({
            color: myColor,
            move: { fr, fc, tr, tc },
            promotion,
            at: Date.now()
        });

        game.turn = nextTurn(myColor);

        socket.to(roomCode).emit('receiveMove', {
            fr,
            fc,
            tr,
            tc,
            promotion
        });

        io.to(roomCode).emit('turnChanged', {
            turn: game.turn
        });

        emitRoomState(roomCode);
    });

    socket.on('disconnect', () => {
        console.log('Comandante desconectado:', socket.id);

        const roomCode = socketToRoom.get(socket.id);
        if (roomCode) {
            closeRoom(roomCode, 'Uno de los jugadores perdió la conexión.');
        }
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Gueides War Game operando en el puerto ${PORT}`);
});
