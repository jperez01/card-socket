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
            io.to(socket.id).emit('player name', currentReadyUsers);
            io.to(socket.id).emit('room users', numUsers);
            io.to(socket.roomID).emit('current ready', currentReadyUsers);
        }
    });

    socket.on('store cards', urls => {
        let id = socket.roomID;
        let length = rooms[id].length;
        let user = 1;
        let index = 0;
        for (let i = 0; i < length; i++) {
            let cards = [];
            for (let j = 0; j < 3; j++) {
                cards.push(urls[index]);
                index++;
            }
            io.to(id).emit('get cards P' + user, cards);
            user++;
        }
        let houseUrls = [];
        let max = 52 - index - 1;
        for (let i = 0; i < max; i++) {
            houseUrls.push(urls[index]);
            index++;
        }
        io.to(id).emit('send house cards', houseUrls);
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