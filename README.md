# ElementBound

## Multiplayer client entry point

Multiplayer mode is additive and activates only when the player interacts with the Online Match panel or the page has a `roomId` query parameter, for example `/?roomId=manual-test-room`. The browser initializes the Firebase compat SDK and signs the player in anonymously before enabling Create/Join. Single-player startup remains unchanged.

The deployment must define the public Firebase Web configuration variables `FIREBASE_WEB_API_KEY` and `FIREBASE_PROJECT_ID`. Optional values are `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, and `FIREBASE_APP_ID`. The `/api/firebase-config` endpoint exposes only these public client settings; Admin credentials remain server-only. Anonymous Authentication must also be enabled in Firebase Console under **Authentication → Sign-in method**.

Test hosts may instead define `window.EB_MULTIPLAYER_DEPS` before `js/game.js` loads with `{user, db, fetchImpl?}`. The `user` must expose `uid` and `getIdToken()`, while `db` must expose the Firestore compat `collection().doc().onSnapshot()` interface.

In multiplayer mode, moves are posted to `/api/submit-move` and the board is rendered only from `rooms/{roomId}/views/{uid}` snapshots. Without a `roomId`, the existing single-player startup and local game loop are unchanged.

Authenticated players can create a direct-invite room from the home screen after choosing a deck. The creator receives a `?join=ROOMID` share link; the invited player chooses their own deck and joins, after which both clients transition to the existing `?roomId=ROOMID` live-view flow. A playable authoritative state is created only when both deck selections are known.
