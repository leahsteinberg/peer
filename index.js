
/* set up regular http server*/
var express = require('express');
var app = express();
var path = require('path');

var server = app.listen(4004, function(){
        var host = server.address().address;
        var port = server.address().port;
        console.log("Peer App listening at http://%s:%s ~~~", host, port);
});

app.use("/public", express.static(path.resolve('public')));

/* htpp end points */

app.get('/', function(req, res) {
  res.sendFile(path.resolve('public/sample.html'));

});

/* peer js server */

var PeerServer = require('peer').PeerServer;
var pserver = PeerServer({port: 9000, path: '/peerapp'});

pserver.on('connection', function(id) { 
  console.log("peer connected: ", id);


 });

pserver.on('disconnect', function(id) {

  console.log("peer disconnected: ", id);
});
