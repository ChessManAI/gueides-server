const http = require('http');
const { Server } = require('socket.io');

// Servidor básico sin dependencias extra
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Gueides War Game - Servidor Online');
});

// Configuración de CORS con puertas abiertas para Hostinger
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let games = {};

io.on('connection', (socket) => {
    console.log('📡 Comandante en el radar:', socket.id);

    // 1. Crear partida
    socket.on('createGame', () => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        games[roomCode] = { players: [socket.id], turn: 'black' };
        socket.join(roomCode);
        
        socket.emit('gameCreated', { roomCode: roomCode, color: 'black' });
        console.log('Sala creada:', roomCode);
    });

    // 2. Unirse
    socket.on('joinGame', (roomCode) => {
        if (games[roomCode] && games[roomCode].players.length < 2) {
            games[roomCode].players.push(socket.id);
            socket.join(roomCode);
            
            socket.emit('gameJoined', { roomCode: roomCode, color: 'white' });
            io.to(roomCode).emit('gameStarted', '¡El oponente se ha unido! Que comience la batalla.');
        } else {
            socket.emit('error', 'Sala llena o inexistente');
        }
    });

    // 3. Mover
    socket.on('sendMove', (data) => {
        if (games[data.roomCode]) {
            socket.to(data.roomCode).emit('receiveMove', data.move);
        }
    });

    socket.on('disconnect', () => {
        console.log('Conexión perdida:', socket.id);
    });
});

// El puerto 0.0.0.0 es vital para que Railway no de Error 502
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Árbitro central operando en puerto ${PORT}`);
});
