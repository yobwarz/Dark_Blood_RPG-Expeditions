import * as campanha from './campanha-drs.mjs';
import {ID,ativo,parte,owner,proteger} from './core.mjs';
import * as historico from './historico.mjs';
import {excluir} from './exclusao.mjs';
import * as logUI from './ui.mjs';
import * as oficina from './oficina.mjs';
import * as comunicacoes from './comunicacoes.mjs';
export const definicoes=[
 {id:'log-campanha-drs',parte:'campanhaDRS',nome:'Campanha · DRS',icone:'fa-book-open',arquivo:'campanha-drs',contexto:campanha.contexto,acoes:{setor:campanha.editarSetor,construir:campanha.construir,testeSetor:campanha.testeSetor,excluir:campanha.excluir,procedimento:campanha.procedimento,etapa:campanha.etapa,excluirEtapa:campanha.excluirEtapa,operarEtapa:campanha.operarEtapa,projeto:campanha.projeto,relogio:campanha.relogio,avancarRelogio:campanha.avancarRelogio,acordo:campanha.acordo}},
 {id:'log-abrigos',parte:'abrigos',nome:'Abrigos',icone:'fa-campground',arquivo:'abrigos',contexto:logUI.contextoAbrigos,acoes:{historicoFiltros:historico.filtros,historicoReset:historico.reset,historicoPagina:historico.pagina,historicoExportar:historico.exportar,historicoLimpar:historico.limpar,excluir,abrigo:logUI.abrigo,deposito:logUI.deposito,instalacao:logUI.instalacao,depositar:logUI.depositar,retirar:logUI.retirar,detalhes:logUI.detalhes,conferir:logUI.conferir}},
 {id:'log-expedicoes',parte:'expedicoes',nome:'Expedições',icone:'fa-route',arquivo:'expedicoes',contexto:logUI.contextoExpedicoes,acoes:{excluir,expedicao:logUI.expedicao,trecho:logUI.trecho,estado:logUI.estadoExp,concluir:logUI.concluirTrecho,esforco:campanha.esforco,conferirEsforco:campanha.conferirEsforco,relogio:logUI.relogio,nota:logUI.nota,checklist:logUI.checklist,resumo:logUI.resumo}},
 {id:'log-oficina',parte:'oficina',nome:'Oficina',icone:'fa-tools',arquivo:'oficina',contexto:oficina.contexto,acoes:{excluir,criar:oficina.criar,iniciar:oficina.estado,cancelar:oficina.estado,concluir:oficina.concluir,conferir:oficina.conferir,descanso:oficina.descanso}},
 {id:'log-comunicacoes',parte:'comunicacoes',nome:'Comunicações',icone:'fa-broadcast-tower',arquivo:'comunicacoes',contexto:comunicacoes.contexto,acoes:{excluir:comunicacoes.excluir,terminal:comunicacoes.terminal,arquivo:comunicacoes.arquivo,ler:comunicacoes.ler,radio:comunicacoes.radio}}
];
let instancia,CentralClass;
export const personagens=()=>game.actors.filter(a=>a.type==='character'&&owner(a));
export function refresh(){if(instancia?.rendered)instancia.render(false);}
export function prepararClasses(){if(CentralClass)return CentralClass;
 const {ApplicationV2,HandlebarsApplicationMixin}=foundry.applications.api;
 CentralClass=class CentralLogistica extends HandlebarsApplicationMixin(ApplicationV2){
  static DEFAULT_OPTIONS={id:'se-central-logistica',classes:['sangue-escuro','log-central'],window:{title:'Sangue Escuro · Expedições e Abrigos',resizable:true},position:{width:1040,height:800},actions:{extensao:CentralLogistica.extensao,mudarAba:CentralLogistica.mudarAba}};
  static PARTS={principal:{template:`modules/${ID}/templates/central.hbs`,scrollable:['.log-central-body']}};
  aba='log-abrigos';
  get actor(){const id=game.settings.get(ID,'personagemCentral');return personagens().find(a=>a.id===id)??(game.user.character&&owner(game.user.character)?game.user.character:personagens()[0])??null;}
  async _prepareContext(options){const ctx=await super._prepareContext(options),defs=definicoes.filter(d=>parte(d.parte));let atual=defs.find(d=>d.id===this.aba)??defs[0];if(atual)this.aba=atual.id;
   return {...ctx,personagens:personagens().map(a=>({id:a.id,nome:a.name,selecionado:a.id===this.actor?.id})),personagem:this.actor?.name??'Nenhum personagem controlado',abas:defs.map(d=>({...d,ativa:d.id===this.aba})),conteudo:atual?await foundry.applications.handlebars.renderTemplate(`modules/${ID}/templates/${atual.arquivo}.hbs`,{...await atual.contexto(this.actor),extId:atual.id}):'<p>Nenhuma área habilitada. Ative os recursos nas configurações do módulo.</p>'};
  }
  _onRender(context,options){super._onRender(context,options);const select=this.element.querySelector('[data-log-personagem]');select?.addEventListener('change',proteger(async()=>{if(!personagens().some(a=>a.id===select.value))throw Error('Personagem indisponível.');await game.settings.set(ID,'personagemCentral',select.value);this.render(false);}));}
  static async mudarAba(event,target){this.aba=target.dataset.aba;await this.render(false);}
  static async extensao(event,target){return proteger(async()=>{const def=definicoes.find(d=>d.id===target.dataset.ext);if(!def||!parte(def.parte)||!def.acoes[target.dataset.acao])throw Error('Ação indisponível.');await def.acoes[target.dataset.acao]({ator:this.actor,documento:this.actor,ficha:this,evento:event,alvo:target});}) ();}
 };
 return CentralClass;
}
export function abrir(){if(!ativo())throw Error('Módulo indisponível.');const C=prepararClasses();instancia??=new C();return instancia.render(true);}
export function registrarMenu(){const {ApplicationV2}=foundry.applications.api;class AbrirCentral extends ApplicationV2{async render(){abrir();return this;}}
 game.settings.registerMenu(ID,'central',{name:'Central de Expedições e Abrigos',label:'Abrir central',hint:'Abrigos, expedições, oficina e comunicações em janela independente.',icon:'fas fa-campground',type:AbrirCentral,restricted:false});}
export function atalho(app,html){if(!ativo())return;const root=html?.querySelector?html:html?.[0];if(!root||root.querySelector('[data-log-abrir]'))return;const b=document.createElement('button');b.type='button';b.dataset.logAbrir='1';b.innerHTML='<i class="fas fa-campground" aria-hidden="true"></i> Expedições e Abrigos';b.addEventListener('click',proteger(abrir));(root.querySelector('#settings-game,.settings-list,.settings')??root).appendChild(b);}
