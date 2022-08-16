/*----------------------------------------------------------------
     Resource: vNetworkify
     Script: managers: socket: parser.js
     Author: vStudio
     Developer(s): Aviril, Mario, Tron
     DOC: 22/07/2022
     Desc: Socket: Parser Manager
----------------------------------------------------------------*/


//////////////
// Imports //
//////////////

const CUtility = require("../../utilities")


/////////////////////
// Static Members //
/////////////////////

// @Desc: Handles socket's initialization
const onSocketInitialize = (socket, route, options) => {
    CUtility.vid.fetch(socket.public)
    options = (CUtility.isObject(options) && options) || false
    socket.private.timestamp = new Date()
    socket.private.heartbeat = {interval: 10000, timeout: 60000}
    socket.private.timer = {}
    if (!CUtility.isServer) socket.private.reconnection = {attempts: -1, interval: 2500}
    socket.private.route = route, socket.private.network = {}, socket.private.room = {}
    if (options) {
        if (!CUtility.isServer) {
            if (CUtility.isObject(options.reconnection)) {
                socket.private.reconnection.attempts = (CUtility.isNumber(options.reconnection.attempts) && ((options.reconnection.attempts == -1) && options.reconnection.attempts) || Math.max(1, options.reconnection.attempts)) || socket.private.reconnection.attempts
                socket.private.reconnection.interval = (CUtility.isNumber(options.reconnection.interval) && Math.max(1, options.reconnection.interval)) || socket.private.reconnection.interval
            }
        }
        if (CUtility.isObject(options.heartbeat)) {
            socket.private.heartbeat.interval = (CUtility.isNumber(options.heartbeat.interval) && Math.max(1, options.heartbeat.interval)) || socket.private.heartbeat.interval
            socket.private.heartbeat.timeout = (CUtility.isNumber(options.heartbeat.timeout) && Math.max(socket.private.heartbeat.interval + 1, options.heartbeat.timeout)) || socket.private.heartbeat.timeout
        }
    }
    if (!CUtility.isServer) socket.public.queue = {}
    else socket.private.client = {}
    return true
}

// @Desc: Handles socket's heartbeat
const onSocketHeartbeat = function(socket, client, clientInstance, receiver, payload) {
    const currentTick = Date.now()
    socket.private["@heartbeat"] = socket.private["@heartbeat"] || {}
    socket.private["@heartbeat"].id = (socket.private["@heartbeat"].id || (payload && 1) || 0) + 1
    if (payload) {
        const prevID = socket.private["@heartbeat"].id - 1
        const prevTick = socket.private["@heartbeat"].tick
        socket.private["@heartbeat"].tick = currentTick
        const deltaTick = socket.private["@heartbeat"].tick - (prevTick || socket.private["@heartbeat"].tick)
        if (!CUtility.isServer) CUtility.exec(socket.public.onHeartbeat, prevID, deltaTick)
        else CUtility.exec(socket.public.onHeartbeat, client, prevID, deltaTick)
    }
    clearTimeout(socket.public.heartbeatTerminator)
    const prevPreTick = socket.private["@heartbeat"].preTick
    socket.private["@heartbeat"].preTick = currentTick
    const prevDeltaTick = socket.private["@heartbeat"].preTick - (prevPreTick || socket.private["@heartbeat"].preTick)
    socket.public.heartbeatTimer = CUtility.scheduleExec(() => {
        if (!CUtility.isServer) CUtility.exec(socket.public.onPreHeartbeat, socket.private["@heartbeat"].id, prevDeltaTick)
        else CUtility.exec(socket.public.onPreHeartbeat, client, socket.private["@heartbeat"].id, prevDeltaTick)
        receiver.send(CUtility.toBase64(JSON.stringify({heartbeat: true})))
    }, (payload && socket.private.heartbeat.interval) || 0)
    socket.public.heartbeatTerminator = CUtility.scheduleExec(() => {
        const cDisconnection = (!CUtility.isServer && socket.private) || (socket.public.isClient(client) && socket.private.client[client]) || false
        if (cDisconnection) socket.private.onDisconnectInstance(cDisconnection, "heartbeat-timeout")
        receiver.close()
    }, socket.private.heartbeat.timeout)
    return true
}

// @Desc: Handles socket's message
const onSocketMessage = async (socket, client, clientInstance, receiver, payload) => {
    payload = JSON.parse(CUtility.fromBase64(payload.data))
    if (!CUtility.isObject(payload)) return false
    if (!CUtility.isString(payload.networkName) || !CUtility.isArray(payload.networkArgs)) {
        if (payload.heartbeat) onSocketHeartbeat(socket, client, clientInstance, receiver, payload)
        else {
            if (!CUtility.isServer) {
                if (payload.client) {
                    CUtility.vid.fetch(socket.public, payload.client)
                    CUtility.exec(socket.public.onClientConnect, payload.client)
                }
                else if (payload.disconnect) socket.private.onDisconnectInstance(socket.private, payload.disconnect, true)
                else if (payload.room) {
                    if (!payload.isLeave) {
                        socket.private.room[(payload.room)] = socket.private.room[(payload.room)] || {}
                        socket.private.room[(payload.room)].member = socket.private.room[(payload.room)].member || {}
                        socket.private.room[(payload.room)].member[client] = true
                        CUtility.exec(socket.public.onClientJoinRoom, payload.room, client)
                    }
                    else {
                        delete socket.private.room[(payload.room)]
                        CUtility.exec(socket.public.onClientLeaveRoom, payload.room, client)
                    }
                }
            }
        }
        return false
    }
    if (CUtility.isObject(payload.networkCB)) {
        if (!payload.networkCB.isProcessed) {
            payload.networkCB.isProcessed = true
            const cNetwork = socket.private.onFetchNetwork(payload.networkName)
            if (!cNetwork || !cNetwork.isCallback) payload.networkCB.isErrored = true
            else payload.networkArgs = [await cNetwork.emitCallback(...payload.networkArgs)]
            receiver.send(CUtility.toBase64(JSON.stringify(payload)))
        }
        else socket.private.onResolveNetwork(client, payload)
        return true
    }
    socket.public.emit(payload.networkName, null, ...payload.networkArgs)
    return true
}


//////////////
// Exports //
//////////////

module.exports = {
    onSocketInitialize,
    onSocketHeartbeat,
    onSocketMessage
}
