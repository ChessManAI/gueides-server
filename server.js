const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Configuramos Socket.io permitiendo conexiones desde cualquier origen (CORS)
const io = new Server(server, {
    cors: { origin: "*" }
});

// Memoria temporal para guardar las salas activas
const games = {};

io.on('connection', (socket) => {
    console.log('📡 Un comandante se ha conectado al radar:', socket.id);

    // 1. Un jugador crea una partida
    socket.on('createGame', () => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        games[roomCode] = { players: [socket.id] };
        
        socket.join(roomCode);
        // Le enviamos su código y le asignamos el Sur (Negras)
        socket.emit('gameCreated', { roomCode, color: 'black' }); 
        console.log(`🎯 Partida creada. Código: ${roomCode}`);
    });

    // 2. Un jugador se une con un código
    socket.on('joinGame', (roomCode) => {
        roomCode = roomCode.toUpperCase();
        
        if (games[roomCode] && games[roomCode].players.length === 1) {
            games[roomCode].players.push(socket.id);
            socket.join(roomCode);
            
            // Le asignamos el Norte (Blancas) al invitado
            socket.emit('gameJoined', { roomCode, color: 'white' });
            
            // Avisamos a toda la sala que la guerra ha comenzado
            io.to(roomCode).emit('gameStarted', '¡Ambos comandantes en línea!');
            console.log(`⚔️ Combate iniciado en la sala: ${roomCode}`);
        } else {
            socket.emit('error', 'Código de canal inválido o sala llena.');
        }
    });

    // 3. Pasar las maniobras a la velocidad de la luz
    socket.on('sendMove', (data) => {
        // data contiene la sala y las coordenadas (fr, fc, tr, tc)
        // Usamos socket.to().emit() para enviarlo a todos en la sala EXCEPTO al que movió
        socket.to(data.roomCode).emit('receiveMove', data.move);
    });

    // 4. Manejar desconexiones
    socket.on('disconnect', () => {
        console.log('❌ Comandante desconectado:', socket.id);
        // (En el futuro aquí pondremos la lógica para avisar de una rendición por desconexión)
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`🚀 SERVIDOR GUEIDES ACTIVO en el puerto ${PORT}`);
});