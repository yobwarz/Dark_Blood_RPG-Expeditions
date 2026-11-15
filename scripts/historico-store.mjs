const ID='sangue-escuro-logistica';
const gm=()=>{if(!game.user.isGM||!game.users.activeGM?.isSelf)throw Error('O histórico completo só pode ser alterado pelo Mestre ativo.');};
const copiar=x=>structuredClone(x);
export function mesclar(...listas){const mapa=new Map();for(const lista of listas)for(const r of lista??[])if(r?.id)mapa.set(r.id,copiar(r));return [...mapa.values()];}
const master=()=>{const d=game.journal?.get(game.settings.get(ID,'historicoDocumento'));return d?.getFlag(ID,'historico')?.tipo==='mestre'?d:null;};
const registros=d=>d?.getFlag(ID,'historico')?.registros??[];
const habilitado=()=>!!game.settings.get(ID,'historicoJogadores');
export function ler(legado=[]){if(game.user.isGM)return mesclar(registros(master()),legado);if(!habilitado())return [];const id=(game.settings.get(ID,'historicoIndividuais')??{})[game.user.id],doc=game.journal?.get(id);if(!doc?.testUserPermission(game.user,'OBSERVER')||doc.getFlag(ID,'historico')?.tipo!=='individual'||doc.getFlag(ID,'historico')?.usuario!==game.user.id)return [];return copiar(registros(doc).filter(r=>r.usuario===game.user.id&&['depositar','retirar'].includes(r.acao)));}
async function garantirMestre(){gm();let d=master();if(!d){d=await JournalEntry.create({name:'Logística — Histórico do Mestre',ownership:{default:0},flags:{[ID]:{historico:{tipo:'mestre',registros:[]}}}});await game.settings.set(ID,'historicoDocumento',d.id);}return d;}
export async function sincronizarPessoais(rows=null){gm();const lista=rows??registros(master()),ids=copiar(game.settings.get(ID,'historicoIndividuais')??{});let mudou=false;const usuarios=new Set([...Object.keys(ids),...(habilitado()?game.users.filter(u=>!u.isGM).map(u=>u.id):[])]);
 for(const id of usuarios){const user=game.users.get(id),own=lista.filter(r=>r.usuario===id&&['depositar','retirar'].includes(r.acao));let d=game.journal?.get(ids[id]);if(!d&&habilitado()&&user&&!user.isGM&&own.length){d=await JournalEntry.create({name:`Logística — Movimentações de ${user.name}`,ownership:{default:0,[id]:2},flags:{[ID]:{historico:{tipo:'individual',usuario:id,registros:own}}}});ids[id]=d.id;mudou=true;}
  if(d)await d.update({ownership:{default:0,...(habilitado()&&user&&!user.isGM?{[id]:2}:{})},[`flags.${ID}.historico`]:{tipo:'individual',usuario:id,registros:own}},{diff:false,recursive:false});
 }
 if(mudou)await game.settings.set(ID,'historicoIndividuais',ids);
}
export async function persistir(rows){gm();if(!rows.length&&!master())return;const d=await garantirMestre();const unidos=mesclar(registros(d),rows);if(JSON.stringify(unidos)!==JSON.stringify(registros(d)))await d.update({ownership:{default:0},[`flags.${ID}.historico`]:{tipo:'mestre',registros:unidos}},{diff:false,recursive:false});await sincronizarPessoais(unidos);}
export async function limparIds(ids){gm();const d=master();if(!d)return 0;const antes=registros(d),remover=new Set(ids),resto=antes.filter(r=>!remover.has(r.id));await sincronizarPessoais(resto);await d.update({ownership:{default:0},[`flags.${ID}.historico`]:{tipo:'mestre',registros:resto}},{diff:false,recursive:false});return antes.length-resto.length;}
