'use strict';

const matchFactory=require('../lib/matchFactory.js');
const engine=require('../lib/gameEngine.js');
const {buildPlayerView}=require('../lib/playerView.js');

const ROOM_ID_PATTERN=/^[A-Z2-9]{6}$/;
function token(req){const match=(req.headers?.authorization||req.headers?.Authorization||'').match(/^Bearer\s+(.+)$/i);return match?.[1]||null}
function send(res,status,body){return res.status(status).json(body)}

function createJoinRoomHandler({auth,db,random=Math.random}){
  return async function joinRoom(req,res){
    if(req.method!=='POST'){res.setHeader?.('Allow','POST');return send(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'})}
    const idToken=token(req);if(!idToken)return send(res,401,{ok:false,error:'AUTH_REQUIRED'});
    let user;try{user=await auth.verifyIdToken(idToken)}catch(error){return send(res,401,{ok:false,error:'INVALID_AUTH_TOKEN'})}
    const roomId=String(req.body?.roomId||'').trim().toUpperCase(),element=req.body?.element,responseElement=req.body?.responseElement;
    if(!ROOM_ID_PATTERN.test(roomId)||!matchFactory.validElement(element))return send(res,400,{ok:false,error:'INVALID_REQUEST'});
    if(responseElement!=null&&matchFactory.responseElement(element,responseElement)!==responseElement)return send(res,400,{ok:false,error:'INVALID_RESPONSE_DECK'});

    try{
      const roomRef=db.collection('rooms').doc(roomId);
      const result=await db.runTransaction(async transaction=>{
        const snapshot=await transaction.get(roomRef);if(!snapshot.exists)return{status:404,body:{ok:false,error:'ROOM_NOT_FOUND'}};
        const room=snapshot.data(),players=room.players;
        if(!Array.isArray(players)||players.length!==2||typeof players[0]!=='string')return{status:500,body:{ok:false,error:'INVALID_ROOM'}};
        const existingSeat=players.indexOf(user.uid);
        if(existingSeat>=0)return{status:200,body:{ok:true,roomId,status:room.status,seat:existingSeat,idempotent:true,code:'ALREADY_IN_ROOM'}};
        if(players[1]!=null)return{status:409,body:{ok:false,error:'ROOM_FULL'}};
        const creatorSelection=room.deckSelections?.[0];
        if(!creatorSelection||!matchFactory.validElement(creatorSelection.element))return{status:500,body:{ok:false,error:'INVALID_ROOM'}};
        const joinSelection={element,responseElement:matchFactory.responseElement(element,responseElement)};
        const state=matchFactory.createInitialState({players:[{name:'Player 1',...creatorSelection},{name:'Player 2',...joinSelection}],random});
        const events=engine.createMatchEvents(state).map((item,index)=>({...item,seq:index+1})),eventSeq=events.length;
        const activePlayers=[players[0],user.uid];
        transaction.update(roomRef,{status:'ACTIVE',players:activePlayers,deckSelections:[creatorSelection,joinSelection],state,events,eventSeq,updatedAt:Date.now()});
        for(let seat=0;seat<2;seat++)transaction.set(roomRef.collection('views').doc(activePlayers[seat]),{status:'ACTIVE',roomId,seat,state:buildPlayerView(state,seat,events),updatedAt:Date.now()});
        return{status:200,body:{ok:true,roomId,status:'ACTIVE',seat:1}};
      });
      return send(res,result.status,result.body);
    }catch(error){console.error('join-room transaction failed',error);return send(res,500,{ok:false,error:'INTERNAL_ERROR'})}
  };
}

let defaultHandler;
async function handler(req,res){if(!defaultHandler){const admin=require('../lib/firebaseAdmin.js');defaultHandler=createJoinRoomHandler({auth:admin.auth(),db:admin.firestore()})}return defaultHandler(req,res)}
module.exports=handler;
module.exports.createJoinRoomHandler=createJoinRoomHandler;
