const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Permiso para que Hostinger se conecte
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

let games = {};

io.on('connection', (socket) => {
    console.log('📡 Un comandante se ha conectado:', socket.id);

    // 1. El jugador le da a "CREAR PARTIDA"
    socket.on('createGame', () => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        games[roomCode] = { players: [socket.id], turn: 'black' };
        socket.join(roomCode);
        
        // ¡Tu engine.js espera un objeto con roomCode y color!
        socket.emit('gameCreated', { roomCode: roomCode, color: 'black' });
        console.log('Sala creada:', roomCode);
    });

    // 2. El jugador le da a "UNIRSE"
    socket.on('joinGame', (roomCode) => {
        if (games[roomCode] && games[roomCode].players.length < 2) {
            games[roomCode].players.push(socket.id);
            socket.join(roomCode);
            
            // Le decimos al jugador 2 que entró con blancas
            socket.emit('gameJoined', { roomCode: roomCode, color: 'white' });
            
            // Les avisamos a ambos que ya pueden jugar
            io.to(roomCode).emit('gameStarted', '¡El oponente se ha unido! Que comience la batalla.');
        } else {
            socket.emit('error', 'Sala llena o inexistente');
        }
    });

    // 3. Un jugador mueve una pieza
    socket.on('sendMove', (data) => {
        const { roomCode, move } = data;
        if (games[roomCode]) {
            // Reenviamos el movimiento al oponente
            socket.to(roomCode).emit('receiveMove', move);
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor Gueides listo en puerto ${PORT}`);
});
