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

io.on('connection', (socket) => {
    console.log('User connected');

    socket.on('create room', () => {
        let newID = idMaker();
        socket.join(newID);
        io.emit('created', newID);
    });

    socket.on('join room', id => {
        console.log(socket + ' joined Room: ' + id);
        socket.join(id);
    });

    socket.on('send to users', id => {
        socket.to(id).emit('Hello');
    })

    socket.on('disconnect', () => {
        console.log('User Disconnected');
    });
});

server.listen(port, () => {
    console.log(`listening on ${port}`);
});

let idMaker = function() {
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}