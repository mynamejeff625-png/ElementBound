'use strict';

const crypto=require('node:crypto');
const matchFactory=require('../lib/matchFactory.js');

const CODE_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function roomCode(){let code='';for(const byte of crypto.randomBytes(6))code+=CODE_ALPHABET[byte%CODE_ALPHABET.length];return code}
function token(req){const match=(req.headers?.authorization||req.headers?.Authorization||'').match(/^Bearer\s+(.+)$/i);return match?.[1]||null}
function send(res,status,body){return res.status(status).json(body)}

function createCreateRoomHandler({auth,db,generateCode=roomCode}){
  return async function createRoom(req,res){
    if(req.method!=='POST'){res.setHeader?.('Allow','POST');return send(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'})}
    const idToken=token(req);if(!idToken)return send(res,401,{ok:false,error:'AUTH_REQUIRED'});
    let user;try{user=await auth.verifyIdToken(idToken)}catch(error){return send(res,401,{ok:false,error:'INVALID_AUTH_TOKEN'})}
    const element=req.body?.element,responseElement=req.body?.responseElement;
    if(!matchFactory.validElement(element))return send(res,400,{ok:false,error:'INVALID_DECK'});
    if(responseElement!=null&&matchFactory.responseElement(element,responseElement)!==responseElement)return send(res,400,{ok:false,error:'INVALID_RESPONSE_DECK'});

    try{
      for(let attempt=0;attempt<8;attempt++){
        const roomId=generateCode(),roomRef=db.collection('rooms').doc(roomId);
        const created=await db.runTransaction(async transaction=>{
          const snapshot=await transaction.get(roomRef);if(snapshot.exists)return false;
          const room={status:'WAITING',players:[user.uid,null],deckSelections:[{element,responseElement:matchFactory.responseElement(element,responseElement)},null],state:null,createdAt:Date.now(),updatedAt:Date.now()};
          transaction.create(roomRef,room);
          transaction.set(roomRef.collection('views').doc(user.uid),{status:'WAITING',roomId,seat:0,state:null,updatedAt:Date.now()});
          return true;
        });
        if(created)return send(res,201,{ok:true,roomId,status:'WAITING'});
      }
      return send(res,503,{ok:false,error:'ROOM_CODE_UNAVAILABLE'});
    }catch(error){console.error('create-room transaction failed',error);return send(res,500,{ok:false,error:'INTERNAL_ERROR'})}
  };
}

let defaultHandler;
async function handler(req,res){if(!defaultHandler){const admin=require('../lib/firebaseAdmin.js');defaultHandler=createCreateRoomHandler({auth:admin.auth(),db:admin.firestore()})}return defaultHandler(req,res)}
module.exports=handler;
module.exports.createCreateRoomHandler=createCreateRoomHandler;
module.exports.roomCode=roomCode;
