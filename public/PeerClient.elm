module PeerClient (makePeer, serverUpdates, receive) where
         

{-| a module for working with [Peer.js](peerjs.com)

#Creating a peer
make a peer
@docs makePeer, serverUpdates, receive
-}
import Task
import Native.PeerClient

{-| the peer type
-}
type Peer = Peer

type alias PeerId = String

{-| the types of communicating to and from a Peer
    IntroPeer is what you get when the server or another peer wants you
    to know about a peer, and it's what you tell your peer when you know about a new peer
-}
type PeerUpdate a = Message PeerId a | IntroPeer PeerId



{-| Make a peer!
-}
makePeer : String -> Task.Task x Peer
makePeer = Native.PeerClient.makePeer


{-| Opening connection from server
-}
serverUpdates : Signal.Address String -> Peer -> Task.Task x ()
serverUpdates = Native.PeerClient.serverUpdates


{-| Getting updates from other peers
-}
receive : Signal.Address String -> Peer -> Task.Task x ()
receive = Native.PeerClient.receive




