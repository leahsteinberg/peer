import PeerClient
import Graphics.Element exposing (show)
import Task exposing (..)
--import SocketIO exposing (..)


peer = PeerClient.makePeer "r6pcbfr5ru1eb3xr"

incoming : Signal.Mailbox String
incoming = Signal.mailbox "null"

incomingPeer : Signal.Mailbox String
incomingPeer = Signal.mailbox "null"


port incomingPeerPort : Task x ()
port incomingPeerPort = peer `andThen` PeerClient.receive incomingPeer.address





port incomingPort : Task x ()
port incomingPort = peer `andThen` (PeerClient.serverUpdates incoming.address)

main = Signal.map (\x -> show x) incomingPeer.signal

