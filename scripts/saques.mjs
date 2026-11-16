/** Contrato opcional com o livro privado do Saques; nunca recebe identidades verdadeiras. */
import {ID,get,save,achar,quantidade,limparItem,comQuantidade,log} from './core.mjs';
const SID='sangue-escuro-saques-mercantes';
export function integration(data,required=false){
 const module=game.modules.get(SID),api=module?.api?.logistica;
 if(module?.active){if(api?.version!==1)throw Error('Atualize Saques e Mercantes e Expedições e Abrigos juntos antes de transferir itens.');return api;}
 if(required||data?.flags?.[SID]?.record)throw Error('Ative Saques e Mercantes para preservar o registro privado deste item.');
 return null;
}
const opts=id=>({saquesStorageTransaction:id});
function pending(id){const s=get(),t=s.transacoes.find(t=>t.id===id);if(!t||t.estado!=='pendente')throw Error('Intenção pendente indisponível.');return {s,t,d:achar(s,t.abrigo,t.deposito).d};}
async function complete(id,actor){const {s,t}=pending(id);t.estado='concluida';t.phase='complete';log(s,t.direcao,`${t.quantidade} × ${t.dados.name}; integração com Saques`,game.users.get(t.usuario)??game.user,{abrigoId:t.abrigo,atorId:actor.id,atorNome:actor.name});await save(s);return t;}
export async function transferIntegrated(id,actor,api){
 let {s,t,d}=pending(id);const plan=await api.prepare(id);
 ({s,t,d}=pending(id));t.saques=plan;t.phase='debiting';await save(s);
 if(t.direcao==='depositar'){
  const item=actor.items.get(t.sourceId);if(!item)throw Error('Origem indisponível após a reserva.');
  if(plan.removeSource||t.dados.type!=='equipamento')await actor.deleteEmbeddedDocuments('Item',[item.id],opts(id));
  else await item.update({system:structuredClone(plan.sourceAfter?.system??{...item.system,quantidade:0})},opts(id));
  ({s,t,d}=pending(id));d.itens.push({id,dados:limparItem(plan.data),espaco:t.espaco});t.phase='credited';await save(s);
 }else{
  const entry=d.itens.find(e=>e.id===t.item);if(!entry)throw Error('Origem do depósito indisponível.');
  if(plan.sourceAfter)entry.dados=limparItem(plan.sourceAfter);else d.itens=d.itens.filter(e=>e.id!==t.item);
  t.phase='debited';await save(s);
  await actor.createEmbeddedDocuments('Item',[{...structuredClone(plan.data),_id:plan.destinationId}],{...opts(id),keepId:true});
  ({s,t}=pending(id));t.phase='credited';await save(s);
 }
 await api.finish(id);return complete(id,actor);
}
export async function reconcileIntegrated(id,decision,actor){
 let {s,t,d}=pending(id);const api=integration(t.dados,true),privateState=api.status(id),plan=privateState?.publicPlan??t.saques;
 if(!['concluir','cancelar'].includes(decision))throw Error('Decisão de conferência inválida.');
 if(privateState&&['committed','done'].includes(privateState.phase)){
  if(decision!=='concluir')throw Error('A integração já confirmou a transferência. Conclua a conferência.');
  await api.finish(id);return complete(id,actor);
 }
 if(privateState?.phase==='cancelled'){
  if(decision!=='cancelar')throw Error('Reserva privada cancelada; cancele a intenção.');
  t.estado='cancelada';await save(s);return t;
 }
 // A reserva pode ter sido gravada mesmo que a resposta de prepare tenha se perdido.
 if(plan){t.saques=plan;await save(s);}
 if(!plan){
  if(decision!=='cancelar'||t.phase!=='intent'||d.itens.some(e=>e.id===id)||actor.items.some(i=>i.flags?.[ID]?.transferencia===id))throw Error('Intenção sem reserva: confira e cancele antes de repetir.');
  await api.cancel(id);t.estado='cancelada';await save(s);return t;
 }
 const matches=(a,b)=>JSON.stringify(limparItem(a))===JSON.stringify(limparItem(b));
 // O comparador privado faz a conferência final exata; aqui só decide a ação física recuperável.
 if(t.direcao==='depositar'){
  const source=actor.items.get(t.sourceId),expected=quantidade(t.dados)-t.quantidade;
  const debited=plan.removeSource||t.dados.type!=='equipamento'?!source:!!source&&quantidade(source.toObject())===expected;
  const intact=!!source&&quantidade(source.toObject())===quantidade(t.dados),credited=d.itens.some(e=>e.id===id);
  if(decision==='concluir'&&debited){if(!credited)d.itens.push({id,dados:limparItem(plan.data),espaco:t.espaco});t.phase='credited';await save(s);await api.finish(id);return complete(id,actor);}
  if(decision!=='cancelar'||!intact||credited)throw Error('Estado incompatível: confira origem e depósito antes de concluir ou cancelar.');
  api.canCancel(id);await api.cancel(id);
 }else{
  const created=actor.items.filter(i=>i.flags?.[ID]?.transferencia===id),entry=d.itens.find(e=>e.id===t.item),rest=entry?quantidade(entry.dados):0,debited=rest===quantidade(t.dados)-t.quantidade;
  if(decision==='concluir'&&debited&&created.length===1){await api.finish(id);return complete(id,actor);}
  if(decision!=='cancelar'||created.length)throw Error('Concluir exige exatamente um destino; cancelar exige ausência de destino criado.');
  api.canCancel(id);
  if(debited){if(entry)entry.dados=limparItem(t.dados);else d.itens.push({id:t.item,dados:limparItem(t.dados),espaco:t.espaco});await save(s);}
  else if(!entry||!matches(entry.dados,t.dados))throw Error('Depósito alterado; confira antes de cancelar.');
  await api.cancel(id);
 }
 ({s,t}=pending(id));t.estado='cancelada';t.phase='cancelled';log(s,'Transferência cancelada',`${t.quantidade} × ${t.dados.name}; conferência ${id}`,game.user,{abrigoId:t.abrigo,atorId:actor.id,atorNome:actor.name});await save(s);return t;
}
