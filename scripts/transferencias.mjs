import {integration,transferIntegrated,reconcileIntegrated} from './saques.mjs';
import {ID,gm,get,save,serial,achar,podeOperar,owner,validarFisico,quantidade,limparItem,comQuantidade,num,int,uid,now,log} from './core.mjs';
function pendente(s){if(s.transacoes.some(t=>t.estado==='pendente')||s.oficina.some(o=>o.tentativa?.estado==='pendente'))throw Error('Há uma transferência pendente de conferência. O Mestre deve reconciliá-la antes de movimentar outros itens.');}
function validar(a,user){if(!podeOperar(a,user))throw Error('Sem permissão para movimentar este abrigo.');if(a.estado!=='seguro')throw Error('O abrigo não está seguro/acessível para movimentação.');}
export async function transferir(req,user,requestId){gm();return serial(async()=>{let s=get();const anterior=s.transacoes.find(t=>t.solicitacao===requestId);if(anterior){if(anterior.estado==='concluida')return anterior;throw Error('Esta solicitação já foi processada ou precisa de conferência.');}pendente(s);const {a,d}=achar(s,req.abrigo,req.deposito);validar(a,user);const actor=await fromUuid(req.ator);if(!actor||actor.documentName!=='Actor'||!owner(actor,user))throw Error('O solicitante não controla esse personagem.');
 const q=int(req.quantidade,1);let data,source,entry;
 if(req.direcao==='depositar'){source=actor.items.get(req.item);if(!source)throw Error('Item não encontrado no personagem.');data=source.toObject();validarFisico(data);if(data.system.vestida||data.system.equipada||data.flags?.['sangue-escuro-dead-space']?.instalado)throw Error('Remova ou desequipe o equipamento antes de depositar.');if(q>quantidade(data))throw Error('Quantidade maior que o estoque do personagem.');}
 else if(req.direcao==='retirar'){entry=d.itens.find(i=>i.id===req.item);if(!entry)throw Error('Item não encontrado no depósito.');data=entry.dados;validarFisico(data);if(q>quantidade(data))throw Error('Quantidade maior que o estoque do depósito.');}
 else throw Error('Direção inválida.');
 const api=integration(data);
 const tx={...(api?{integracaoSaques:1,phase:'intent'}:{}),id:uid(),solicitacao:requestId,estado:'pendente',tempo:now(),usuario:user.id,abrigo:a.id,deposito:d.id,ator:actor.uuid,direcao:req.direcao,item:req.item,quantidade:q,dados:limparItem(data),espaco:num(req.direcao==='retirar'?entry.espaco:req.espaco??1),sourceId:source?.id??null};
 // Persistent intent before touching an Actor: recoverable after disconnect/restart.
 s.transacoes.push(tx);await save(s);
 try{
  if(api)return await transferIntegrated(tx.id,actor,api);
  if(req.direcao==='depositar'){
   if(quantidade(source.toObject())!==quantidade(data))throw Error('O inventário mudou durante a preparação; confira a transferência pendente.');
   if(data.type==='equipamento')await source.update({'system.quantidade':quantidade(data)-q});
   else await actor.deleteEmbeddedDocuments('Item',[source.id]);
   s=get();const target=achar(s,a.id,d.id).d;target.itens.push({id:tx.id,dados:comQuantidade(data,q),espaco:tx.espaco});
  }else{
   // Source debit is durable before destination creation.
   const rest=quantidade(entry.dados)-q;if(rest)entry.dados=comQuantidade(entry.dados,rest);else d.itens=d.itens.filter(i=>i.id!==entry.id);await save(s);
   const destination=comQuantidade(data,q);destination.flags??={};destination.flags[ID]={...(destination.flags[ID]??{}),transferencia:tx.id};
   await actor.createEmbeddedDocuments('Item',[destination]);s=get();
  }
  const t=s.transacoes.find(t=>t.id===tx.id);t.estado='concluida';log(s,req.direcao,`${q} × ${data.name} · ${a.nome} / ${d.nome} ↔ ${actor.name}`,user,{abrigoId:a.id,abrigoNome:a.nome,atorId:actor.id,atorNome:actor.name});await save(s);return t;
 }catch(error){
  // No blind retry/rollback: an update may have committed before its response was lost.
  ui.notifications.error('Transferência interrompida. Os dados e a intenção foram preservados. Use Conferir transferência pendente antes de repetir.');throw error;
 }
 });}
export async function reconciliar(id,decisao){gm();return serial(async()=>{const s=get(),t=s.transacoes.find(t=>t.id===id&&t.estado==='pendente');if(!t)throw Error('Transação pendente não encontrada.');const {d}=achar(s,t.abrigo,t.deposito);const actor=await fromUuid(t.ator);if(!actor)throw Error('Personagem indisponível; restaure-o antes de reconciliar.');
 if(t.integracaoSaques||t.saques)return reconcileIntegrated(id,decisao,actor);
 if(t.direcao==='depositar'){
  const source=actor.items.get(t.sourceId),expected=quantidade(t.dados)-t.quantidade;
  const debitado=t.dados.type==='equipamento'?!!source&&quantidade(source.toObject())===expected:!source;
  const intacto=t.dados.type==='equipamento'?!!source&&quantidade(source.toObject())===quantidade(t.dados):!!source;
  const credited=d.itens.some(i=>i.id===t.id);
  if(decisao==='concluir'&&debitado){if(!credited)d.itens.push({id:t.id,dados:comQuantidade(t.dados,t.quantidade),espaco:t.espaco});t.estado='concluida';}
  else if(decisao==='cancelar'&&intacto&&!credited)t.estado='cancelada';
  else throw Error('Estado incompatível. Não houve alteração: confira o item no personagem e no depósito.');
 }else{
  const created=actor.items.filter(i=>i.getFlag(ID,'transferencia')===t.id);const entry=d.itens.find(i=>i.id===t.item);const restante=entry?quantidade(entry.dados):0;const debitado=restante===quantidade(t.dados)-t.quantidade;
  if(decisao==='concluir'&&debitado&&created.length===1)t.estado='concluida';
  else if(decisao==='cancelar'&&created.length===0){
   if(debitado){if(entry)entry.dados=comQuantidade(t.dados,quantidade(t.dados));else d.itens.push({id:t.item,dados:limparItem(t.dados),espaco:t.espaco});}
   else if(restante!==quantidade(t.dados))throw Error('Quantidade foi alterada; confira antes de reconciliar.');t.estado='cancelada';
  }else throw Error('Concluir exige exatamente um item de destino identificado; cancelar exige ausência de item criado. Confira os dois lados.');
 }
 log(s,`Transferência ${t.estado}`,`${t.quantidade} × ${t.dados.name}; conferência ${t.id}`,game.user,{abrigoId:t.abrigo,abrigoNome:get().abrigos.find(a=>a.id===t.abrigo)?.nome??'',atorId:actor.id,atorNome:actor.name});await save(s);return t;
 });}
