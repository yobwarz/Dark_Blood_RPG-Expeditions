import {ID,get,mudar,gm,uid,now,texto,num,int,log,form,campo,area,select,check,esc,owner,acesso} from './core.mjs';

export const SETORES={
 medico:{nome:'Médico · Estação de Tratamento',pericia:'mecanica',cd:13,horas:4,materiais:'4 Metais e um Kit Médico completo',beneficio:'+2 em Medicina para tratamento dentro do setor; não aumenta PV recuperados.',teste:'medicina'},
 oficina:{nome:'Oficina · Bancada de Manutenção',pericia:'mecanica',cd:13,horas:6,materiais:'5 Madeiras e 3 Metais',beneficio:'+2 em Mecânica para reparos; metade do tempo de reparos de pelo menos 10 minutos.',teste:'mecanica'},
 seguranca:{nome:'Segurança · Posto de Vigilância',pericia:'engenharia',cd:15,horas:8,materiais:'8 Madeiras e 4 Metais',beneficio:'+2 em Percepção durante vigilância das áreas visíveis. Pode conceder +1 Segurança se eliminar uma vulnerabilidade; máximo 10.',teste:'percepcao'},
 armazenamento:{nome:'Armazenamento · Depósito Organizado',pericia:'engenharia',cd:12,horas:6,materiais:'6 Madeiras e 2 Metais',beneficio:'+4 Compartimentos, dentro do limite de expansão de 50% da capacidade original. O Mestre configura a capacidade dos depósitos uma única vez.'},
 comunicacoes:{nome:'Comunicações · Central de Rádio',pericia:'eletronica',cd:15,horas:8,materiais:'3 Metais, rádio funcional e fonte de energia',beneficio:'+2 em Eletrônica para operar, ajustar ou reparar comunicação no setor. Exige energia e respeita o alcance do equipamento.',teste:'eletronica'},
 alimentacao:{nome:'Alimentação · Cozinha Comunitária',pericia:'oficio',cd:12,horas:6,materiais:'5 Madeiras, 2 Metais e utensílios de cozinha',beneficio:'+2 em Sobrevivência ou Ofício no preparo, conservação ou purificação que permita teste. Não cria recursos.',teste:'sobrevivencia'}
};
export const PROJETOS={
 alarme:{nome:'Alarme de Passagem Improvisado',minutos:30,cd:12,materiais:'2 SC',ferramentas:'Ferramentas manuais apropriadas',resultado:'Instalar: 10 minutos. Produz ruído quando o mecanismo é acionado. Não causa dano nem identifica criaturas. Rearmar: 1 minuto.'},
 iluminacao:{nome:'Suporte de Iluminação',minutos:30,cd:12,materiais:'1 PM',ferramentas:'Ferramentas manuais e bancada apropriada',resultado:'Instalar: 10 minutos. Exige fonte luminosa fornecida separadamente. Não melhora alcance, intensidade ou duração da luz.'},
 caixa:{nome:'Caixa de Armazenamento Improvisada',minutos:60,cd:10,materiais:'1 Madeira e 1 SC',ferramentas:'Ferramentas manuais apropriadas',resultado:'Armazena até 2 Compartimentos, apoiada ou instalada em local adequado. Não aumenta carga pessoal nem cria espaços dentro de outras estruturas.'}
};
const lista=s=>{s.campanhaDRS??={setores:[],procedimentos:[],relogios:[],acordos:[]};return s.campanhaDRS;};
const atores=()=>game.actors.filter(a=>a.type==='character'&&owner(a));
const personagens=()=>atores().map(a=>[a.uuid,a.name]);
const confirmar=async(title,content)=>foundry.applications.api.DialogV2.confirm({window:{title},content});
const achar=(s,tipo,id)=>{const r=lista(s)[tipo]?.find(x=>x.id===id);if(!r)throw Error('Registro não encontrado.');return r;};
export function contexto(){const s=get(),c=lista(s);return {gm:game.user.isGM,setores:c.setores.filter(x=>game.user.isGM||acesso(s.abrigos.find(a=>a.id===x.abrigo))).map(x=>({...x,abrigoNome:s.abrigos.find(a=>a.id===x.abrigo)?.nome??'Abrigo removido',...SETORES[x.tipo],equipado:x.estado==='equipado'})),procedimentos:c.procedimentos.map(p=>({...p,etapas:p.etapas.map((e,i)=>({...e,numero:i+1,responsavelNome:game.actors.find(a=>a.uuid===e.responsavel)?.name??'Não definido'}))})),relogios:game.user.isGM?c.relogios:[],acordos:c.acordos};}
export async function editarSetor({alvo:b}){
 gm();const s=get(),velho=b.dataset.id?achar(s,'setores',b.dataset.id):{};
 const d=await form('Setor da Zona Segura',`<label>Abrigo${select('abrigo',s.abrigos.map(a=>[a.id,a.nome]),velho.abrigo)}</label><label>Setor${select('tipo',Object.entries(SETORES).map(([k,v])=>[k,v.nome]),velho.tipo)}</label><label>Estado${select('estado',[['inexistente','Inexistente'],['improvisado','Improvisado'],['equipado','Equipado · melhoria já construída']],velho.estado)}</label>${area('nota','Estrutura, equipamentos e condições',velho.nota)}${check('confirmado','Para marcar Equipado, a construção, o teste e os materiais já foram resolvidos conforme o DRS.')}<p>Uma melhoria de cada tipo por abrigo. O setor depende de seus recursos e equipamentos. Para construir com tempo e teste, registre como Improvisado e use Construir.</p>`);
 if(!d)return;if(d.estado==='equipado'&&velho.estado!=='equipado'&&!d.confirmado)throw Error('Confirme a construção já resolvida ou use o procedimento de construção.');
 await mudar(s=>{const c=lista(s);if(!s.abrigos.some(a=>a.id===d.abrigo)||!SETORES[d.tipo])throw Error('Abrigo ou setor inválido.');if(c.setores.some(x=>x.id!==velho.id&&x.abrigo===d.abrigo&&x.tipo===d.tipo))throw Error('Este setor já foi registrado neste abrigo.');const r={id:velho.id??uid(),abrigo:d.abrigo,tipo:d.tipo,estado:d.estado,nota:texto(d.nota)};if(velho.id)Object.assign(achar(s,'setores',velho.id),r);else c.setores.push(r);log(s,'Setor atualizado',SETORES[d.tipo].nome);});
}
export async function excluir({alvo:b}){
 gm();const tipo=b.dataset.tipo;if(!['setores','procedimentos','relogios','acordos'].includes(tipo))throw Error('Categoria inválida.');
 if(!await confirmar('Excluir registro','<p>Excluir este registro? Recursos consumidos, itens produzidos e tempo decorrido permanecem registrados; a exclusão não os devolve.</p>'))return;
 await mudar(s=>{const c=lista(s);achar(s,tipo,b.dataset.id);c[tipo]=c[tipo].filter(x=>x.id!==b.dataset.id);if(tipo==='setores')for(const p of c.procedimentos)if(p.setor===b.dataset.id){p.setor=null;p.nota=(p.nota??'')+' · Setor de origem removido.';}log(s,'Exclusão DRS',tipo);});
}
export async function construir({alvo:b}){
 gm();const x=achar(get(),'setores',b.dataset.id),r=SETORES[x.tipo];if(x.estado==='equipado')throw Error('Melhoria já equipada.');
 const d=await form('Construir melhoria',`<p>${esc(r.nome)} · ${r.horas} horas · CD ${r.cd}. Materiais: ${esc(r.materiais)}. Falha preserva materiais e exige nova tentativa completa. Interrupção preserva tempo se a estrutura e os materiais permanecerem íntegros.</p><label>Responsável${select('responsavel',personagens())}</label><label>Perícia${select('pericia',[[r.pericia,r.pericia],...(['medico','armazenamento'].includes(x.tipo)?[['engenharia','Engenharia']]:[])])}</label>${check('requisitos','Espaço, materiais e ferramentas disponíveis; recursos separados para esta construção.')}`);
 if(!d?.requisitos)return;
 await mudar(s=>{const c=lista(s);if(c.procedimentos.some(p=>p.setor===x.id&&!p.concluido))throw Error('Já há construção em aberto.');c.procedimentos.push({id:uid(),nome:r.nome,setor:x.id,etapas:[{id:uid(),nome:'Construção',minutos:r.horas*60,pericia:d.pericia,cd:r.cd,responsavel:d.responsavel,estado:'pendente',requisitos:r.materiais,continuo:false,decorrido:0}],concluido:false});});
}
export async function testeSetor({ator:a,alvo:b}){
 const s=get(),x=achar(s,'setores',b.dataset.id),r=SETORES[x.tipo];if(!acesso(s.abrigos.find(a=>a.id===x.abrigo))||x.estado!=='equipado'||!r.teste||!a||!owner(a)||!a.podeAgir())throw Error('Selecione um responsável capaz de usar este setor equipado.');
 const d=await form('Teste dentro do setor',`<p>${esc(r.beneficio)} O bônus não se acumula com instalações que representem a mesma vantagem.</p><label>Perícia${select('pericia',x.tipo==='alimentacao'?[['sobrevivencia','Sobrevivência'],['oficio','Ofício']]:[[r.teste,r.teste]])}</label>${campo('cd','CD aplicável',12,'number')}${check('condicoes','Atividade permitida, equipamentos e consumíveis disponíveis; teste executado dentro do setor.')}`);if(!d?.condicoes)return;
 const p=a.system.pericias[d.pericia];if(!p)throw Error('Perícia indisponível.');
 return a.rolarTeste({chave:p.attr,bonus:p.bonus,rotulo:r.nome,cd:num(d.cd),contexto:{setorDRS:x.id}});
}
export async function procedimento({alvo:b}){
 gm();const velho=b.dataset.id?achar(get(),'procedimentos',b.dataset.id):null;
 const d=await form('Procedimento prolongado',`${campo('nome','Nome',velho?.nome)}${area('nota','Objetivo e condições',velho?.nota)}${!velho?`<label>Complexidade${select('quantidade',[['2','Simples · 2 etapas'],['3','Moderado · 3 etapas'],['4','Complexo · 4 etapas']])}</label>`:'<p>Edite cada etapa separadamente. Etapas concluídas permanecem concluídas.</p>'}`);if(!d)return;
 await mudar(s=>{if(!texto(d.nome))throw Error('Informe o nome.');if(velho){Object.assign(achar(s,'procedimentos',velho.id),{nome:texto(d.nome,150),nota:texto(d.nota)});return;}lista(s).procedimentos.push({id:uid(),nome:texto(d.nome,150),nota:texto(d.nota),concluido:false,etapas:Array.from({length:int(d.quantidade,2,4)},(_,i)=>({id:uid(),nome:`Etapa ${i+1}`,minutos:60,pericia:'mecanica',cd:12,responsavel:'',requisitos:'',estado:'pendente',continuo:true,decorrido:0}))});});
}
export async function etapa({alvo:b}){
 gm();const p=achar(get(),'procedimentos',b.dataset.id),e=p.etapas.find(x=>x.id===b.dataset.etapa);if(!e)throw Error('Etapa inexistente.');
 const d=await form('Editar etapa',`${campo('nome','Atividade concreta',e.nome)}${campo('minutos','Minutos por tentativa',e.minutos,'number')}<label>Responsável${select('responsavel',[['','Não definido'],...personagens()],e.responsavel)}</label><label>Perícia${select('pericia',[['','Sem teste'],...Object.entries(CONFIG.SE.PERICIAS).map(([k,v])=>[k,v.nome])],e.pericia)}</label>${campo('cd','CD (quando houver teste)',e.cd,'number')}${area('requisitos','Materiais, ferramentas, custos e consequências',e.requisitos)}<label>Depende da etapa${select('depende',[['','Independente'],...p.etapas.filter(x=>x.id!==e.id).map(x=>[x.id,x.nome])],e.depende)}</label>${check('continuo','Esta etapa exige atenção contínua; interrupção reinicia a etapa',e.continuo)}`);
 if(d)await mudar(s=>{const et=achar(s,'procedimentos',p.id).etapas.find(x=>x.id===e.id);if(et.estado!=='pendente')throw Error('Interrompa ou reabra antes de editar uma etapa iniciada.');const vistos=new Set([et.id]);let dep=d.depende;while(dep){if(vistos.has(dep))throw Error('As dependências formam um ciclo.');vistos.add(dep);dep=achar(s,'procedimentos',p.id).etapas.find(x=>x.id===dep)?.depende;}Object.assign(et,{nome:texto(d.nome,150),minutos:num(d.minutos,1),cd:num(d.cd),pericia:d.pericia,responsavel:d.responsavel,requisitos:texto(d.requisitos),depende:d.depende,continuo:!!d.continuo});});
}
export async function excluirEtapa({alvo:b}){
 gm();if(!await confirmar('Excluir etapa','<p>Excluir a etapa e seu registro de progresso? Não restitui tempo ou materiais já usados.</p>'))return;
 await mudar(s=>{const p=achar(s,'procedimentos',b.dataset.id);if(p.setor||p.projeto)throw Error('Construções e projetos têm uma etapa normativa; exclua o procedimento inteiro.');if(p.etapas.length<=2)throw Error('Um procedimento prolongado deve manter pelo menos duas etapas.');if(p.etapas.some(x=>x.depende===b.dataset.etapa))throw Error('Remova primeiro a dependência desta etapa nas demais.');p.etapas=p.etapas.filter(x=>x.id!==b.dataset.etapa);p.concluido=p.etapas.every(e=>e.estado==='concluida');});
}
export async function operarEtapa({alvo:b}){
 gm();const op=b.dataset.operacao;
 const ok=await confirmar('Etapa do procedimento',op==='resolver'?'<p>Confirme a continuidade, os recursos efetivamente usados e as condições do trabalho. Materiais são contabilizados pelo Mestre segundo a regra específica; falha não perde automaticamente todos os materiais.</p>':op==='iniciar'?'<p>Confirme requisitos disponíveis, recursos separados e equipamentos sem uso simultâneo incompatível. O relógio do mundo não será avançado automaticamente.</p>':'<p>Confirme a interrupção ou reabertura desta etapa. As demais etapas concluídas serão preservadas.</p>');if(!ok)return;
 await mudar(async s=>{
  const c=lista(s),p=achar(s,'procedimentos',b.dataset.id),e=p.etapas.find(x=>x.id===b.dataset.etapa);if(!e)throw Error('Etapa não encontrada.');
  if(op==='iniciar'){
   if(e.estado!=='pendente')throw Error('Etapa já iniciada ou concluída.');
   if(e.depende&&p.etapas.find(x=>x.id===e.depende)?.estado!=='concluida')throw Error('Etapa anterior ainda incompleta.');
   const a=await fromUuid(e.responsavel);if(!a?.podeAgir())throw Error('Escolha um responsável capaz de executar a etapa.');
   if(c.procedimentos.some(p=>p.etapas.some(x=>x.estado==='em-andamento'&&x.responsavel===e.responsavel)))throw Error('Este responsável já está trabalhando em outra etapa.');
   Object.assign(e,{inicio:now(),estado:'em-andamento'});
  }else if(op==='interromper'){
   if(e.estado!=='em-andamento')throw Error('Etapa sem trabalho em andamento.');
   e.decorrido=e.continuo?0:Math.min(e.minutos*60,(e.decorrido??0)+Math.max(0,now()-e.inicio));e.estado='pendente';
  }else if(op==='reabrir'){
   if(e.estado==='em-andamento')throw Error('Interrompa primeiro.');
   e.estado='pendente';e.decorrido=0;p.concluido=false;
  }else if(op==='resolver'){
   if(e.estado!=='em-andamento'||now()-e.inicio+(e.decorrido??0)<e.minutos*60)throw Error('A duração exigida ainda não foi cumprida.');
   const a=await fromUuid(e.responsavel);if(!a?.podeAgir())throw Error('Responsável indisponível.');
   const produzido=p.projeto?a.items.find(i=>i.getFlag(ID,'projetoDRS')===p.id):null;if(produzido){e.estado='concluida';p.concluido=p.etapas.every(x=>x.estado==='concluida');p.itemProduzido=produzido.uuid;return;}
   let sucesso=true;if(e.pericia){const skill=a.system.pericias[e.pericia];if(!skill)throw Error('Perícia inválida.');const r=await a.rolarTeste({chave:skill.attr,bonus:skill.bonus,rotulo:p.nome+' · '+e.nome,cd:e.cd});sucesso=r.total>=e.cd;e.ultimoResultado=r.total;}
   e.estado=sucesso?'concluida':'pendente';e.decorrido=0;
   p.concluido=p.etapas.every(x=>x.estado==='concluida');
   if(p.concluido&&p.setor)achar(s,'setores',p.setor).estado='equipado';
   if(p.concluido&&p.projeto){const projeto=PROJETOS[p.projeto];const existente=a.items.find(i=>i.getFlag(ID,'projetoDRS')===p.id);if(!existente){const [item]=await a.createEmbeddedDocuments('Item',[{name:projeto.nome,type:'equipamento',img:'icons/svg/item-bag.svg',system:{quantidade:1,descricao:`<p>${esc(projeto.resultado)}</p>`},flags:{[ID]:{projetoDRS:p.id}}}]);p.itemProduzido=item.uuid;}else p.itemProduzido=existente.uuid;}
   log(s,sucesso?'Etapa concluída':'Tentativa falhou',p.nome+' · '+e.nome);
  }else throw Error('Operação inválida.');
 });
}
export async function projeto(){
 gm();const d=await form('Fabricação de projeto conhecido',`<label>Projeto${select('projeto',Object.entries(PROJETOS).map(([k,p])=>[k,p.nome]))}</label><label>Responsável${select('responsavel',personagens())}</label><p>Materiais: Alarme 2 SC; Suporte 1 PM; Caixa 1 Madeira e 1 SC. Ferramentas manuais; Suporte exige bancada. Alarme e Suporte: 30 min, Mecânica CD 12. Caixa: 1 h, Mecânica CD 10. Falha comum preserva materiais.</p>${check('conhece','O personagem conhece o projeto e possui os materiais, ferramentas e condições; recursos separados para este serviço.')}`);if(!d?.conhece)return;
 const r=PROJETOS[d.projeto];if(!r)throw Error('Projeto inválido.');
 await mudar(s=>lista(s).procedimentos.push({id:uid(),nome:r.nome,projeto:d.projeto,nota:r.resultado,concluido:false,etapas:[{id:uid(),nome:'Fabricação',minutos:r.minutos,pericia:'mecanica',cd:r.cd,responsavel:d.responsavel,requisitos:r.materiais+' · '+r.ferramentas,estado:'pendente',continuo:true,decorrido:0}]}));
}
export async function relogio({alvo:b}){
 gm();const velho=b.dataset.id?achar(get(),'relogios',b.dataset.id):{};
 const d=await form('Relógio de ameaça',`${campo('nome','Objetivo / ameaça',velho.nome)}<label>Segmentos${select('max',[['4','4 · ameaça local'],['6','6 · crise prolongada']],String(velho.max??4))}</label>${area('gatilhos','Gatilhos previstos, um por linha',velho.gatilhos)}${area('nota','Sinais, intervenção e período de avaliação',velho.nota)}`);if(!d)return;
 await mudar(s=>{if(!texto(d.nome))throw Error('Informe a ameaça.');const c=lista(s);const r={id:velho.id??uid(),nome:texto(d.nome,150),max:int(d.max,4,6),gatilhos:texto(d.gatilhos),nota:texto(d.nota),progresso:velho.progresso??0,avaliacoes:velho.avaliacoes??[]};if(r.progresso>r.max)throw Error('O novo limite não pode ser inferior ao progresso registrado.');if(velho.id)Object.assign(achar(s,'relogios',velho.id),r);else c.relogios.push(r);});
}
export async function avancarRelogio({alvo:b}){
 gm();const r=achar(get(),'relogios',b.dataset.id);const d=await form('Avaliar ameaça',`<p>${esc(r.nome)} · ${r.progresso}/${r.max}. Um mesmo gatilho avança no máximo uma vez por período. Nenhum dano ou condição será aplicado automaticamente.</p><label>Operação${select('op',[['avancar','Gatilho ocorreu · +1'],['remover','Intervenção desfaz progresso · −1'],['encerrar','Objetivo impossível ou ameaça encerrada']])}</label><label>Gatilho${select('gatilho',r.gatilhos.split('\n').filter(Boolean).map(g=>[g,g]))}</label>${campo('periodo','Identificação do período de avaliação (cena, dia ou expedição)')}${area('motivo','Fato concreto / intervenção')}`);if(!d)return;
 await mudar(s=>{const x=achar(s,'relogios',r.id);if(x.encerrado)throw Error('Relógio encerrado.');if(d.op==='avancar'&&x.progresso>=x.max)throw Error('Relógio completo: confirme o objetivo e encerre o registro.');if(!texto(d.motivo))throw Error('Informe o fato concreto.');if(d.op==='avancar'){if(!texto(d.periodo)||!r.gatilhos.split('\n').includes(d.gatilho))throw Error('Informe um período e um gatilho previsto.');const k=d.periodo+'::'+d.gatilho;if(x.avaliacoes.includes(k))throw Error('Gatilho já avaliado neste período.');x.avaliacoes.push(k);x.progresso=Math.min(x.max,x.progresso+1);}else if(d.op==='remover')x.progresso=Math.max(0,x.progresso-1);else x.encerrado=true;log(s,'Relógio de ameaça',x.nome+' · '+d.motivo);});
}
export async function acordo({alvo:b}){
 gm();const velho=b.dataset.id?achar(get(),'acordos',b.dataset.id):{};const d=await form('Acordo ou dívida',`${campo('nome','Participantes / compromisso',velho.nome)}${area('nota','Obrigações, contrapartidas, prazo, condições e garantias',velho.nota)}<label>Estado${select('estado',[['proposto','Proposto'],['aceito','Aceito pelas partes'],['cumprido','Cumprido'],['encerrado','Encerrado']],velho.estado)}</label><p>Não transfere itens nem altera automaticamente Moral, reputação ou amizade.</p>`);if(!d)return;
 await mudar(s=>{if(!texto(d.nome))throw Error('Informe o compromisso.');const r={id:velho.id??uid(),nome:texto(d.nome,150),nota:texto(d.nota),estado:d.estado};if(velho.id)Object.assign(achar(s,'acordos',velho.id),r);else lista(s).acordos.push(r);});
}
export function registrarBonus(){Hooks.on('sangueEscuro.penalidades',(a,r,ctx)=>{if(!game.modules.get(ID)?.active||!game.settings.get(ID,'campanhaDRS')||!ctx.setorDRS)return;const s=get(),x=lista(s).setores.find(x=>x.id===ctx.setorDRS);if(x?.estado==='equipado'&&acesso(s.abrigos.find(a=>a.id===x.abrigo)))r.partes.push({rotulo:SETORES[x.tipo].nome,valor:2,grupo:'instalacao'});});}
export async function esforco({alvo:b}){
 gm();const exp=get().expedicoes.find(e=>e.id===b.dataset.id);if(!exp)throw Error('Expedição indisponível.');
 const trechos=exp.trechos.filter(t=>t.concluido&&t.ritmo==='acelerado');
 if(!trechos.length)throw Error('Nenhum trecho acelerado concluído.');
 const d=await form('Esforço de viagem acelerada',`<label>Trecho concluído${select('trecho',trechos.map(t=>[t.id,t.nome+' · '+t.real+' segundos']))}</label>${campo('calor','CD de calor extremo, se o mesmo esforço ativar esse teste (0 = não se aplica)',0,'number')}<p>Acumula tempo por personagem até Descanso Longo. A cada 4 horas efetivas, CON CD 12. Um teste simultâneo de calor usa somente a maior CD e uma Exaustão por falha. Não resolve novamente testes desse mesmo esforço por outro painel.</p>${check('confirmar','O tempo não foi registrado antes para estes personagens e os testes simultâneos serão resolvidos somente aqui.')}`);if(!d?.confirmar)return;
 const trecho=trechos.find(t=>t.id===d.trecho),chave=exp.id+':'+trecho.id,cd=Math.max(12,num(d.calor));
 for(const id of exp.participantes){
  const a=game.actors.get(id);if(!a||a.getFlag('sangue-escuro','morto'))continue;
  const feitos=a.getFlag(ID,'esforcosResolvidos')??[];if(feitos.includes(chave))continue;
  if(a.getFlag(ID,'esforcoPendente'))throw Error('Há uma resolução de esforço interrompida. Confira o registro do personagem antes de nova aplicação.');
  const antes=Number(a.getFlag('sangue-escuro','esforcoAcelerado')??0),r=game.sangueEscuro.drs.esforcoAcelerado(antes,trecho.real);
  await a.setFlag(ID,'esforcoPendente',{chave,antes,total:r.total,testes:r.testes,concluidos:0});
  let falhas=0;for(let i=0;i<r.testes;i++){const roll=await a.rolarTeste({chave:'con',rotulo:'Esforço de viagem acelerada',cd});if(roll.total<cd)falhas++;await a.setFlag(ID,'esforcoPendente',{chave,antes,total:r.total,testes:r.testes,concluidos:i+1,falhas});}
  await a.update({'flags.sangue-escuro.esforcoAcelerado':r.total,[`flags.${ID}.esforcosResolvidos`]:[...feitos,chave],[`flags.${ID}.esforcoPendente`]:null,'system.exaustao.value':Math.min(6,a.system.exaustao.value+falhas)});
 }
}
export function bancadaDRS(abrigo){if(!game.settings.get(ID,'campanhaDRS'))return null;const c=lista(get());return c.setores.find(x=>x.abrigo===abrigo&&x.tipo==='oficina'&&x.estado==='equipado');}
export async function conferirEsforco(){
 gm();const pendentes=atores().filter(a=>a.getFlag(ID,'esforcoPendente'));if(!pendentes.length)throw Error('Não há esforço interrompido.');
 const d=await form('Conferir esforço interrompido',`<label>Personagem${select('ator',pendentes.map(a=>[a.uuid,a.name]))}</label>${campo('falhas','Total final de falhas, após conferir as rolagens no chat',0,'number')}<p>Confira os testes já realizados. Resolva manualmente apenas os que faltarem. Este controle não repete rolagens. A Exaustão deste serviço só é aplicada na conclusão.</p>${check('confirmar','Todos os testes devidos estão resolvidos e o total de falhas foi conferido; a Exaustão desta resolução ainda não foi aplicada.')}`);if(!d?.confirmar)return;
 const a=pendentes.find(a=>a.uuid===d.ator),p=a?.getFlag(ID,'esforcoPendente');if(!p)throw Error('Registro indisponível.');const falhas=int(d.falhas,0,p.testes),feitos=a.getFlag(ID,'esforcosResolvidos')??[];
 if(feitos.includes(p.chave))throw Error('Esse trecho já foi resolvido.');
 await a.update({'flags.sangue-escuro.esforcoAcelerado':p.total,[`flags.${ID}.esforcosResolvidos`]:[...feitos,p.chave],[`flags.${ID}.esforcoPendente`]:null,'system.exaustao.value':Math.min(6,a.system.exaustao.value+falhas)});
}
