# ElementBound

## Multiplayer client entry point

Multiplayer mode is additive and activates only when the page has a `roomId` query parameter, for example `/?roomId=manual-test-room`. The page expects an already-authenticated Firebase client session and an initialized Firestore compat instance (`window.firebase`), because authentication and room creation are handled by separate flows.

Test hosts may instead define `window.EB_MULTIPLAYER_DEPS` before `js/game.js` loads with `{user, db, fetchImpl?}`. The `user` must expose `uid` and `getIdToken()`, while `db` must expose the Firestore compat `collection().doc().onSnapshot()` interface.

In multiplayer mode, moves are posted to `/api/submit-move` and the board is rendered only from `rooms/{roomId}/views/{uid}` snapshots. Without a `roomId`, the existing single-player startup and local game loop are unchanged.

Authenticated players can create a direct-invite room from the home screen after choosing a deck. The creator receives a `?join=ROOMID` share link; the invited player chooses their own deck and joins, after which both clients transition to the existing `?roomId=ROOMID` live-view flow. A playable authoritative state is created only when both deck selections are known.
