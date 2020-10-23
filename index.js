const express = require('express');
const app = express();
const http = require('http');
const socketio = require('socket.io');
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketio(server);

app.get('/', (req, res) => {
    res.send('Hello');
});

// Shows all the rooms
let rooms = io.sockets.adapter.rooms;
// Shows the number of users ready to play in each room
let readyUsers = {};
// Shows if a room is playing a game
let playingRoom = {};

io.on('connection', (socket) => {

    console.log('User connected');

    socket.on('create room', () => {
        let newID = idMaker();

        socket.join(newID);
        socket.roomID = newID;
        readyUsers[newID] = 0;
        playingRoom[newID] = false;

        console.log('User joined room: ' + newID);
        io.emit('created', newID);
    });

    socket.on('join room', id => {
        if (rooms[id].length === 4) {
            io.to(socket.id).emit('Too many players', null);
        } else {
            socket.join(id);
            socket.roomID = id;
            let newUsersInRoom = rooms[id].length;

            console.log('Socket joined Room: ' + id);
    
            if (newUsersInRoom === 2) {
                io.to(socket.roomID).emit('enough players', null);
            }
            io.to(socket.id).emit('joined room', 'Joined');
            if (!gameStarted(socket.roomID)) {
                io.to(socket.roomID).emit('room users', newUsersInRoom);
            }
        }
    });

    socket.on('send to users', id => {
        socket.to(id).emit('Hello');
    });

    socket.on('get room users', () => {
        let numUsers = rooms[socket.roomID].length;
        readyUsers[socket.roomID] = readyUsers[socket.roomID] + 1;
        let currentReadyUsers = readyUsers[socket.roomID];

        console.log('User got num of users in room: ' + socket.roomID);
        console.log('Total Users: ' + numUsers);
        console.log('Ready Users: ' + currentReadyUsers);

        if (gameStarted(socket.roomID)) {
            io.to(socket.id).emit('game in progress', null);
        } else {
            io.to(socket.id).emit('room users', numUsers);
            io.to(socket.roomID).emit('current ready', currentReadyUsers);
        }
    });

    socket.on('game started', () => {
        playingRoom[socket.roomID] = true;
    });

    socket.on('game ended', () => {
        playingRoom[socket.roomID] = false;
    })

    socket.on('disconnect', () => {
        console.log('User Disconnected');
    });
});

server.listen(port, () => {
    console.log(`listening on ${port}`);
});

let gameStarted = function(roomID) {
    return playingRoom[roomID];
}

let idMaker = function() {
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}