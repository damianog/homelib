var serviceTypeToName,
    serviceNameToType,
    Buffer = require('buffer').Buffer,
    UnexpectedValueError = require('../../Error/UnexpectedValueError'),
    invert = require('underscore').invert;

serviceTypeToName = {
    0x0201: "search.request",
    0x0202: "search.response",
    0x0203: "description.request",
    0x0204: "description.response",
    0x0205: "connection.request",
    0x0206: "connection.response",
    0x0207: "connectionstate.request",
    0x0208: "connectionstate.response",
    0x0209: "disconnect.request",
    0x020a: "disconnect.response",
    0x0310: "configuration.request",
    0x0311: "configuration.ack",
    0x0420: "tunneling.request",
    0x0421: "tunneling.ack",
    0x0530: "routing.indication",
    0x0531: "routing.lostmessage"
};

serviceNameToType = invert(serviceTypeToName);

// Turn a value into a formatted hex string
function toHex(n) {
    if (n < 16) return '0' + n.toString(16);
    return n.toString(16);
}

/**
 * The packet class represents a data packet which is used to be sent
 * to an udp socket. The packet has a 6 byte header which contains the
 * given service type. The given data bytes follow after the header.
 *
 * @class Driver.KnxIp.Packet
 *
 * @param {Number} serviceType Two byte service type identifier
 * @param {Array} data Array with packet data
 * @constructor
 */
function Packet(serviceType, data) {
    this._serviceType = serviceType & 0xffff;
    this._data = data || [];
}

/**
 * Returns a new buffer instance which represents this knx ip packet.
 *
 * @returns {buffer.Buffer}
 */
Packet.prototype.toBuffer = function() {
    var i,
        data = this._data,
        serviceType = this._serviceType,
        totalLength = 6 + data.length,
        buffer = new Buffer(totalLength);

    buffer[0] = 0x06; // header length
    buffer[1] = 0x10; // protocol version
    buffer[2] = (serviceType >> 8) & 0xff;
    buffer[3] = serviceType & 0xff;
    buffer[4] = (totalLength >> 8) & 0xff;
    buffer[5] = totalLength & 0xff;

    for (i = 0; i < data.length; i++) {
        buffer.writeUInt8(data[i], i + 6);
    }

    return buffer;
}

/**
 * Returns a string representation for this packet. This method is
 * automatically called when a packet instance is passed to console
 * methods.
 *
 * @returns {String}
 */
Packet.prototype.inspect = function() {
    var data = this._data,
        out = [];

    for (i = 0; i < data.length; i++) {
        out.push(toHex(data[i]));
    }

    return '<KnxIpPacket (' + this.getServiceName() + ') ' + out.join(' ') + '>';
};

/**
 * Returns service type value
 *
 * @returns {Number}
 */
Packet.prototype.getServiceType = function() {
    return this._serviceType;
}

/**
 * Returns a human readable version of the service type.
 *
 * @return {String}
 */
Packet.prototype.getServiceName = function() {
    var high, low,
        serviceType = this._serviceType,
        string = serviceTypeToName[serviceType];

    if (!string) {
        high = (serviceType >> 8);
        low  = (serviceType & 0xff);
        string = "0x" + toHex(high) + toHex(low);
    }

    return string;
}

/**
 * Returns packet data
 *
 * @returns {Array}
 */
Packet.prototype.getData = function() {
    return this._data;
}

/**
 * Class method to parse an array of buffer into an package object. If the
 * given data does not correspond to the specification an exception will be
 * thrown.
 *
 * @param {Array|buffer.Buffer} raw Data to parse
 * @returns Driver.KnxIp.Packet
 */
Packet.parse = function(raw) {
    if (raw instanceof Buffer) {
        raw = raw.toJSON();
    }

    if (raw[0] !== 0x06) {
        throw new UnexpectedValueError('Expected header length of 6, but ' + raw[0] + ' given.');
    }

    if (raw[1] !== 0x10) {
        throw new UnexpectedValueError('Unsupported protocol version. Only 1.0 is supported.');
    }

    if (((raw[4] << 8) | raw[5]) !== raw.length) {
        throw new UnexpectedValueError('Data has not correct length. Expected ' + ((raw[4] << 8) | raw[5]) + ' bytes');
    }

    return new Packet((raw[2] << 8 | raw[3]), raw.slice(6));
}

module.exports = Packet;