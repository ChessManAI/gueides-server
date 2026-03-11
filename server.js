const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Esto permite que Hostinger y Railway hablen sin bloqueos
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

let rooms = {};

io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('createRoom', () => {
        const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
        // Ahora guardamos también los tiempos (600 segundos = 10 min)
        rooms[roomId] = {
            players: [socket.id],
            board: null,
            turn: 'black', // Inician negras según tu tablero
            timers: { black: 600, white: 600 },
            lastTick: null
        };
        socket.join(roomId);
        socket.emit('roomCreated', roomId);
        console.log('Sala creada:', roomId);
    });

    socket.on('joinRoom', (roomId) => {
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            // El segundo en entrar siempre será Blancas
            io.to(roomId).emit('playerJoined', { 
                roomId, 
                whitePlayer: socket.id 
            });
        } else {
            socket.emit('error', 'Sala llena o no existe');
        }
    });

    socket.on('makeMove', (data) => {
        const { roomId, move } = data;
        if (rooms[roomId]) {
            rooms[roomId].board = move.board;
            rooms[roomId].turn = move.turn;
            // Reenviamos la jugada al oponente
            socket.to(roomId).emit('moveMade', move);
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Gueides corriendo en puerto ${PORT}`);
});
