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
// Shows if name is available
let availableNames = {};


io.on('connection', (socket) => {

    console.log('User connected');

    socket.on('create room', () => {
        let newID = idMaker();

        socket.join(newID);
        socket.roomID = newID;
        socket.name = 'P1';
        readyUsers[newID] = 0;
        playingRoom[newID] = false;
        availableNames[newID] = {
            P1: false,
            P2: false,
            P3: false,
            P4: false
        };

        console.log('User joined room: ' + newID);
        io.emit('created', newID, 1);
    });

    socket.on('join room', id => {
        if (rooms[id].length === 4) {
            io.to(socket.id).emit('Too many players');
        } else {
            socket.join(id);
            socket.roomID = id;
            let newUsersInRoom = rooms[id].length;
            for (let i = 0; i < newUsersInRoom; i++) {
                let value = `P${i}`;
                if (availableNames[socket.roomID][value]) {
                    socket.name = value;
                    break;
                }
            }
            if (socket.name === undefined) {
                socket.name = `P${newUsersInRoom}`;
            }

            console.log('Socket joined Room: ' + id);
            if (newUsersInRoom === 2) {
                io.to(socket.roomID).emit('enough players');
            }
            io.to(socket.id).emit('joined room', socket.name);
            if (!gameStarted(socket.roomID)) {
                io.to(socket.roomID).emit('room users', newUsersInRoom);
            }
        }
    });

    socket.on('rejoin room', (roomID) => {
        socket.join(roomID);
        socket.roomID = roomID;
        playingRoom[roomID] = false;
        readyUsers[roomID] = 0;
        io.to(socket.roomID).emit('suspend game');
    });

    socket.on('leave room', (roomID) => {
        socket.leave(roomID);
        availableNames[socket.roomID][socket.name] = true;
        socket.name = undefined;
        socket.roomID = undefined;
        socket.broadcast.to(roomID).emit('player left', rooms[roomID].length);
    })

    socket.on('get room users', () => {
        console.log("users gotten");
        if (gameStarted(socket.roomID)) {
            io.to(socket.id).emit('game in progress');
        } else {
            let numUsers = rooms[socket.roomID].length;
            readyUsers[socket.roomID] += 1;
            let currentReadyUsers = readyUsers[socket.roomID];
            
            io.to(socket.id).emit('room users', numUsers);
            io.to(socket.roomID).emit('current ready', currentReadyUsers);
        }
    });

    socket.on('get end users', () => {
        let numUsers = rooms[socket.roomID].length;
        io.to(socket.id).emit('room users', numUsers);
    })
    socket.on('enable reset', () => {
        let numUsers = rooms[socket.roomID].length;
        readyUsers[socket.roomID] += 1;
        let currentReadyUsers = readyUsers[socket.roomID];

        io.to(socket.id).emit('room users', numUsers);
        io.to(socket.roomID).emit('current ready', currentReadyUsers);
    });

    socket.on('cancel reset', () => {
        readyUsers[socket.roomID] -= 1;
        let currentReady = readyUsers[socket.roomID];
        socket.broadcast.to(socket.roomID).emit('current ready', currentReady);
    })

    socket.on('reset', () => {
        io.to(socket.id).emit('reset');
    });

    socket.on('store cards', urls => {
        playingRoom[socket.roomID] = true;
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
        let dealtCards = [];
        let max = 52 - index - 1;
        for (let i = 0; i < 3; i++) {
            dealtCards.push(urls[index]);
            index++;
        }
        for (let i = 3; i < max; i++) {
            houseUrls.push(urls[index]);
            index++;
        }
        io.to(id).emit('send house cards', houseUrls, dealtCards);
    });

    socket.on('deal card', () => {
        io.to(socket.roomID).emit('handle deal');
    });

    socket.on('send card', (url, player) => {
        io.to(socket.id).emit(`dealt card ${player}`, url);
    });

    socket.on('change turn', (player) => {
        io.to(socket.roomID).emit('next player', player);
    })

    socket.on('game started', () => {
        io.to(socket.roomID).emit('start game');
    });

    socket.on('game ended', () => {
        readyUsers[socket.roomID] = 0;
        playingRoom[socket.roomID] = false;
        io.to(socket.roomID).emit('game ended');
    })

    socket.on('disconnect', () => {
        if (socket.roomID !== undefined) {
            socket.leave(socket.roomID);
            availableNames[socket.roomID][socket.name] = true;
        }
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