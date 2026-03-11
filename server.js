const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.end('Servidor Gueides War Game en linea');
});

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let games = {};

io.on('connection', (socket) => {
    console.log('Comandante conectado:', socket.id);

    socket.on('createGame', () => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        games[roomCode] = { players: [socket.id], turn: 'black' };
        socket.join(roomCode);
        socket.emit('gameCreated', { roomCode: roomCode, color: 'black' });
    });

    socket.on('joinGame', (roomCode) => {
        if (games[roomCode] && games[roomCode].players.length < 2) {
            games[roomCode].players.push(socket.id);
            socket.join(roomCode);
            socket.emit('gameJoined', { roomCode: roomCode, color: 'white' });
            io.to(roomCode).emit('gameStarted', '¡El oponente se ha unido! Que comience la batalla.');
        }
    });

    socket.on('sendMove', (data) => {
        const { roomCode, move } = data;
        if (games[roomCode]) {
            socket.to(roomCode).emit('receiveMove', move);
        }
    });

    socket.on('disconnect', () => {
        console.log('Comandante desconectado:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor operando en el puerto ${PORT}`);
});
