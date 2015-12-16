module PeerClient (makePeer, serverUpdates) where
         

{-| a module for working with [Peer.js](peerjs.com)

#Creating a peer
make a peer
@docs makePeer, serverUpdates
-}
import Task
import Native.PeerClient

{-| the peer type
-}
type Peer = Peer

{-| Make a peer!
-}
makePeer : String -> Task.Task x Peer
makePeer = Native.PeerClient.makePeer


{-| Opening connection from server
-}
serverUpdates : Signal.Address String -> Peer -> Task.Task x ()
serverUpdates = Native.PeerClient.serverUpdates





