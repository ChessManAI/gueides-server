const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuración de CORS para permitir la conexión desde Hostinger
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let games = {}; // Usamos 'games' como tenías en tu imagen

io.on('connection', (socket) => {
    console.log('📡 Un comandante se ha conectado:', socket.id);

    // 1. Un jugador crea una partida
    socket.on('createGame', () => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        games[roomCode] = { 
            players: [socket.id],
            timers: { black: 600, white: 600 },
            turn: 'black'
        };
        socket.join(roomCode);
        socket.emit('gameCreated', roomCode);
        console.log('Sala creada:', roomCode);
    });

    // 2. Un jugador se une
    socket.on('joinGame', (roomCode) => {
        if (games[roomCode] && games[roomCode].players.length < 2) {
            games[roomCode].players.push(socket.id);
            socket.join(roomCode);
            io.to(roomCode).emit('playerJoined', { roomCode, whitePlayer: socket.id });
            console.log('Jugador unido a:', roomCode);
        } else {
            socket.emit('error', 'Sala llena o inexistente');
        }
    });

    // 3. Movimiento de piezas
    socket.on('makeMove', (data) => {
        const { roomCode, move } = data;
        if (games[roomCode]) {
            socket.to(roomCode).emit('moveMade', move);
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Gueides listo en puerto ${PORT}`);
});
