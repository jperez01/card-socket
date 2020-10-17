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
    const response = new Date();

    socket.on('disconnect', () => {
        clearInterval(interval);
    });

    socket.on('message', data => {
        console.log(data);
    })
});

server.listen(port, () => {
    console.log(`listening on ${port}`);
});