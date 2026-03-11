const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});

const games = {};

io.on('connection', (socket) => {
    console.log('📡 Un comandante se ha conectado:', socket.id);

    socket.on('createGame', () => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        games[roomCode] = { players: [socket.id] };
        socket.join(roomCode);
        socket.emit('gameCreated', { roomCode, color: 'black' }); 
    });

    socket.on('joinGame', (roomCode) => {
        roomCode = roomCode.toUpperCase();
        if (games[roomCode] && games[roomCode].players.length === 1) {
            games[roomCode].players.push(socket.id);
            socket.join(roomCode);
            socket.emit('gameJoined', { roomCode, color: 'white' });
            io.to(roomCode).emit('gameStarted', '¡Ambos comandantes en línea!');
        } else {
            socket.emit('error', 'Código inválido o sala llena.');
        }
    });

    socket.on('sendMove', (data) => {
        socket.to(data.roomCode).emit('receiveMove', data.move);
    });

    socket.on('disconnect', () => {
        console.log('❌ Comandante desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 SERVIDOR GUEIDES ACTIVO`);
});
