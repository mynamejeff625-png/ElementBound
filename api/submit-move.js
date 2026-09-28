'use strict';

const engine=require('../lib/gameEngine.js');
const {buildPlayerView}=require('../lib/playerView.js');

const ROOM_ID_PATTERN=/^[A-Za-z0-9_-]{1,128}$/;

function bearerToken(req){
  const header=req.headers?.authorization||req.headers?.Authorization;
  const match=typeof header==='string'&&header.match(/^Bearer\s+(.+)$/i);
  return match?match[1]:null;
}

function send(res,status,body){
  return res.status(status).json(body);
}

function statusForEngineError(error){
  if(error==='REVISION_MISMATCH')return 409;
  if(error==='NOT_YOUR_TURN'||error==='NOT_RESPONSE_DEFENDER')return 403;
  return 400;
}

function createSubmitMoveHandler({auth,db,rulesEngine=engine,now=Date.now}){
  if(!auth||!db)throw new TypeError('auth and db are required');

  return async function submitMove(req,res){
    if(req.method!=='POST'){
      res.setHeader?.('Allow','POST');
      return send(res,405,{ok:false,error:'METHOD_NOT_ALLOWED'});
    }

    const token=bearerToken(req);
    if(!token)return send(res,401,{ok:false,error:'AUTH_REQUIRED'});

    let decoded;
    try{
      decoded=await auth.verifyIdToken(token);
    }catch(error){
      return send(res,401,{ok:false,error:'INVALID_AUTH_TOKEN'});
    }

    const roomId=req.body?.roomId;
    const requestedMove=req.body?.move;
    if(typeof roomId!=='string'||!ROOM_ID_PATTERN.test(roomId)||!requestedMove||typeof requestedMove!=='object'||Array.isArray(requestedMove)){
      return send(res,400,{ok:false,error:'INVALID_REQUEST'});
    }

    const roomRef=db.collection('rooms').doc(roomId);
    try{
      const result=await db.runTransaction(async transaction=>{
        const snapshot=await transaction.get(roomRef);
        if(!snapshot.exists)return {status:404,body:{ok:false,error:'ROOM_NOT_FOUND'}};

        const room=snapshot.data();
        const players=room.players;
        if(!Array.isArray(players)||players.length!==2||!players.every(uid=>typeof uid==='string')){
          return {status:500,body:{ok:false,error:'INVALID_ROOM'}};
        }

        const seat=players.indexOf(decoded.uid);
        if(seat<0)return {status:403,body:{ok:false,error:'NOT_A_PLAYER'}};
        if(Object.hasOwn(requestedMove,'actor')&&requestedMove.actor!==seat){
          return {status:403,body:{ok:false,error:'ACTOR_MISMATCH'}};
        }

        const move={...requestedMove,actor:seat},serverNow=now();
        const resolution=rulesEngine.validateAndApplyMove(room.state,move,{now:serverNow});
        if(!resolution.ok){
          return {status:statusForEngineError(resolution.error),body:{ok:false,error:resolution.error,detail:resolution.detail||null}};
        }

        const previous=Array.isArray(room.events)?room.events:[],start=Number.isInteger(room.eventSeq)?room.eventSeq:(previous.at(-1)?.seq||0);
        const appended=resolution.events.map((item,index)=>({...item,seq:start+index+1}));
        const events=previous.concat(appended).slice(-200),eventSeq=start+appended.length;
        transaction.update(roomRef,{state:resolution.state,events,eventSeq});
        for(let playerSeat=0;playerSeat<players.length;playerSeat++){
          const viewRef=roomRef.collection('views').doc(players[playerSeat]);
          transaction.set(viewRef,{state:buildPlayerView(resolution.state,playerSeat,events,serverNow),updatedAt:serverNow});
        }
        return {status:200,body:{ok:true,autoResolved:!!resolution.autoResolved,state:buildPlayerView(resolution.state,seat,events,serverNow)}};
      });
      return send(res,result.status,result.body);
    }catch(error){
      console.error('submit-move transaction failed',error);
      return send(res,500,{ok:false,error:'INTERNAL_ERROR'});
    }
  };
}

let defaultHandler;
async function handler(req,res){
  if(!defaultHandler){
    const admin=require('../lib/firebaseAdmin.js');
    defaultHandler=createSubmitMoveHandler({auth:admin.auth(),db:admin.firestore()});
  }
  return defaultHandler(req,res);
}

module.exports=handler;
module.exports.createSubmitMoveHandler=createSubmitMoveHandler;
module.exports.buildPlayerView=buildPlayerView;
module.exports.statusForEngineError=statusForEngineError;
