const ACHIEVEMENTS = [
 {key:'first_game',name:'Primeira aventura',icon:'🎮',description:'Inicie sua primeira partida.',points:20,field:'games',target:1},
 {key:'safe_10',name:'Passos seguros',icon:'🧭',description:'Revele 10 casas seguras.',points:30,field:'safe_tiles',target:10},
 {key:'first_reward',name:'Caçador de tesouros',icon:'🪙',description:'Encontre sua primeira recompensa.',points:40,field:'rewards',target:1},
 {key:'three_rewards',name:'Colecionador',icon:'🎁',description:'Encontre 3 recompensas no total.',points:60,field:'rewards',target:3},
 {key:'first_win',name:'Primeira vitória',icon:'🏆',description:'Vença uma partida.',points:100,field:'wins',target:1},
 {key:'five_games',name:'Explorador',icon:'🔥',description:'Jogue 5 partidas.',points:75,field:'games',target:5},
 {key:'master_500',name:'Mestre Orango',icon:'👑',description:'Acumule 500 pontos em partidas.',points:150,field:'earned_points',target:500}
];
const headers = (key, extra={}) => ({apikey:key, Authorization:`Bearer ${key}`, 'Content-Type':'application/json', ...extra});
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
async function sb(path, method='GET', body=null, prefer='') {
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key) throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas variáveis do Netlify.');
 const h=headers(key); if(prefer)h.Prefer=prefer;
 const r=await fetch(`${url}/rest/v1/${path}`,{method,headers:h,body:body?JSON.stringify(body):undefined});
 const txt=await r.text(); let data; try{data=txt?JSON.parse(txt):null}catch{data=txt}
 if(!r.ok) throw new Error(typeof data==='string'?data:(data?.message||data?.hint||'Erro no banco Supabase.'));
 return data;
}
async function authUser(req){
 const token=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
 if(!token) return null;
 const url=process.env.SUPABASE_URL, anon=process.env.SUPABASE_ANON_KEY;
 const r=await fetch(`${url}/auth/v1/user`,{headers:{apikey:anon,Authorization:`Bearer ${token}`}});
 if(!r.ok)return null; return await r.json();
}
async function ensurePlayer(uid){
 await sb(`players?id=eq.${uid}&select=id`, 'GET');
 const found=await sb(`players?id=eq.${uid}&select=id`);
 if(!found.length) await sb('players','POST',{id:uid,nickname:'Visitante'},'resolution=ignore-duplicates,return=minimal');
}
async function getPlayer(uid){const a=await sb(`players?id=eq.${uid}&select=*`);return a[0]||{};}
async function unlocked(uid){const a=await sb(`player_achievements?player_id=eq.${uid}&select=achievement_key`);return a.map(x=>x.achievement_key);}
async function addEvent(uid,body){
 const ev=String(body.event||''); const allowed=['game_start','safe_tile','reward','win','mine_hit']; if(!allowed.includes(ev))throw new Error('Evento inválido.');
 const rewardPoints={'Moeda Orango':40,'Selo Explorador':60,'Item surpresa':80,'Desconto de 20% em um curso':100,'Coroa Mestre':150};
 const amount=ev==='safe_tile'?10:ev==='win'?50:ev==='reward'?(rewardPoints[String(body.details||'')]||0):0;
 const col={game_start:'games',safe_tile:'safe_tiles',reward:'rewards',win:'wins'}[ev];
 let p=await getPlayer(uid); const patch={points:(p.points||0)+amount,earned_points:(p.earned_points||0)+amount,updated_at:new Date().toISOString()}; if(col)patch[col]=(p[col]||0)+1;
 await sb(`players?id=eq.${uid}`,'PATCH',patch,'return=minimal');
 await sb('game_history','POST',{player_id:uid,event:ev,points:amount,details:String(body.details||'').slice(0,120),difficulty:['easy','medium','hard'].includes(body.difficulty)?body.difficulty:'easy'},'return=minimal');
 p=await getPlayer(uid); const have=new Set(await unlocked(uid)); const newly=[];
 for(const a of ACHIEVEMENTS){if((p[a.field]||0)>=a.target&&!have.has(a.key)){await sb('player_achievements','POST',{player_id:uid,achievement_key:a.key},'resolution=ignore-duplicates,return=minimal');await sb(`players?id=eq.${uid}`,'PATCH',{points:(p.points||0)+a.points},'return=minimal');await sb('game_history','POST',{player_id:uid,event:'achievement',points:a.points,details:a.name},'return=minimal');p.points=(p.points||0)+a.points;newly.push({key:a.key,name:a.name,icon:a.icon,description:a.description,points:a.points});}}
 p.new_achievements=newly;p.achievements_count=(await unlocked(uid)).length;return p;
}
export default async (req)=>{
 try{
  const url=new URL(req.url), path=url.pathname.replace(/^\/.netlify\/functions\/api\/?/,'').replace(/^api\/?/,'');
  const user=await authUser(req);
  if(!user?.id)return json({error:'Sessão de jogador não encontrada. Atualize a página para entrar como visitante.'},401);
  const uid=user.id; await ensurePlayer(uid);
  if(req.method==='GET'&&path==='profile'){const p=await getPlayer(uid);p.achievements_count=(await unlocked(uid)).length;return json(p)}
  if(req.method==='POST'&&path==='player'){const b=await req.json();const nickname=String(b.nickname||'').trim().replace(/\s+/g,' ');if(!nickname||nickname.length>24)return json({error:'Informe um apelido de 1 a 24 caracteres.'},400);await sb(`players?id=eq.${uid}`,'PATCH',{nickname,updated_at:new Date().toISOString()},'return=minimal');return json(await getPlayer(uid))}
  if(req.method==='GET'&&path==='achievements'){const got=new Set(await unlocked(uid));return json(ACHIEVEMENTS.map(a=>({...a,unlocked:got.has(a.key)})))}
  if(req.method==='GET'&&path==='leaderboard'){const rows=await sb('players?nickname=neq.Visitante&select=id,nickname,points,games,wins,created_at&order=points.desc,wins.desc,games.desc,created_at.asc&limit=100');const ids=rows.map(x=>x.id);const all=ids.length?await sb(`player_achievements?player_id=in.(${ids.join(',')})&select=player_id,achievement_key`):[];return json(rows.map(p=>({...p,achievements:all.filter(a=>a.player_id===p.id).length,is_me:p.id===uid})))}
  if(req.method==='GET'&&path==='summary'){const p=await getPlayer(uid);p.achievements_count=(await unlocked(uid)).length;p.top_players=await sb('players?nickname=neq.Visitante&select=nickname,points,wins,games&order=points.desc,wins.desc,games.desc&limit=3');return json(p)}
  if(req.method==='POST'&&path==='event'){return json(await addEvent(uid,await req.json()))}
  if(req.method==='GET'&&path==='history'){return json(await sb(`game_history?player_id=eq.${uid}&select=event,points,details,created_at&order=id.desc&limit=30`))}
  if(req.method==='DELETE'&&path.startsWith('players/')){const target=decodeURIComponent(path.split('/')[1]||'');if(target!==uid)return json({error:'Você só pode excluir seu próprio jogador.'},403);await sb(`players?id=eq.${uid}`,'DELETE');return json({message:'Seu jogador e seus dados foram excluídos.'})}
  return json({error:'Rota não encontrada.'},404);
 }catch(e){return json({error:e.message||'Erro inesperado.'},500)}
};
