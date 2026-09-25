import { Server } from "socket.io";
import http from "http";

export function initSocket(server: http.Server): Server {
    const io = new Server(server, { 
        cors: {
            origin: process.env.CLIENT_URL,
            credentials: true
        }
    })

    io.on('conection', (socket) => {
        console.log("Client connected:' socket.id")

        socket.on('join_admin_rome', () => {
            socket.join('admin_room');
        })

        socket.on('join_order_room', (orderId: number) => {
            socket.join(`order_${orderId}`)
        })

        socket.on('disconnect', () => {
            console.log('Client disconected: ', socket.id);
        })
    })

    return io
}