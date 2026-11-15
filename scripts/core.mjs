import {ler as lerHistorico,persistir as persistirHistorico} from './historico-store.mjs';
export const ID='sangue-escuro-logistica';
export const ativo=()=>game.system.id==='sangue-escuro'&&!!game.modules.get(ID)?.active;
export const parte=n=>ativo()&&game.settings.get(ID,n);
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const texto=(s,max=5000)=>String(s??'').trim().slice(0,max);
export const uid=()=>foundry.utils.randomID();
export const now=()=>Number(game.time.worldTime);
export const gm=()=>{if(!ativo()||!game.user.isGM||!game.users.activeGM?.isSelf)throw Error('Esta operação exige o Mestre ativo.');};
export function int(v,min=0,max=1e7){const n=Number(v);if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('Quantidade inteira inválida.');return n;}
export function num(v,min=0,max=1e7){const n=Number(v);if(!Number.isFinite(n)||n<min||n>max)throw Error('Valor numérico inválido.');return n;}
export const owner=(actor,user=game.user)=>!!actor?.testUserPermission(user,'OWNER');
export const acesso=(abrigo,user=game.user)=>!!abrigo&&(user.isGM||abrigo.acesso==='grupo'||abrigo.usuarios.includes(user.id));
export const podeOperar=(abrigo,user=game.user)=>acesso(abrigo,user)&&(user.isGM||abrigo.operadores.includes(user.id));
export function veExp(e,s,user=game.user){return user.isGM||e.editores.includes(user.id)||e.participantes.some(id=>owner(game.actors.get(id),user))||acesso(s.abrigos.find(a=>a.id===e.origem),user);}
export const editaExp=(e,user=game.user)=>user.isGM||e.editores.includes(user.id);
export const get=()=>{const s=structuredClone(game.settings.get(ID,'dados'));s.oficina??=[];s.log=lerHistorico(s.log);return s;};
export const temPendencia=s=>s.transacoes.some(t=>t.estado==='pendente')||(s.oficina??[]).some(o=>o.tentativa?.estado==='pendente');
export const save=async s=>{gm();await persistirHistorico(s.log??[]);const operacional=structuredClone(s);operacional.log=[];await game.settings.set(ID,'dados',operacional);};
let fila=Promise.resolve();
export function serial(fn){const p=fila.catch(()=>{}).then(fn);fila=p;return p;}
export async function mudar(fn){gm();return serial(async()=>{const s=get();const result=await fn(s);await save(s);return result;});}
export function achar(s,abrigoId,depositoId){const a=s.abrigos.find(a=>a.id===abrigoId);if(!a)throw Error('Abrigo não encontrado.');const d=a.depositos.find(d=>d.id===depositoId);if(!d)throw Error('Depósito não encontrado.');return {a,d};}
export const quantidade=data=>data.type==='equipamento'?int(data.system.quantidade??1):1;
export function limparItem(data){const d=structuredClone(data);delete d._id;delete d.folder;delete d.ownership;delete d._stats;delete d.sort;return d;}
export function comQuantidade(data,q){const d=limparItem(data);if(d.type==='equipamento')d.system.quantidade=q;return d;}
export function unidadeEspaco(data){if(data.type==='habilidade'||data.flags?.['sangue-escuro']?.virtual)return 0;if(data.type==='equipamento'){if(data.system.compartimentosFixos)return num(data.system.compartimentosFixos);const por=data.system.porCompartimento;return por?1/num(por,1):1;}return data.type==='arma'&&data.flags?.['sangue-escuro-dead-space']?.espaco?num(data.flags['sangue-escuro-dead-space'].espaco):1;}
export const ocupado=d=>d.itens.reduce((n,i)=>n+num(i.espaco)*quantidade(i.dados),0);
export function validarFisico(data){if(!['arma','protecao','equipamento'].includes(data.type)||data.flags?.['sangue-escuro']?.virtual)throw Error('Somente itens físicos podem ser armazenados; cartões e habilidades ficam fora do depósito.');if(quantidade(data)<1)throw Error('Item sem quantidade disponível.');}
export function log(s,acao,detalhes,user=game.user,vinculos={}){s.log.push({id:uid(),tempo:now(),registradoEm:new Date().toISOString(),usuario:user.id,nome:user.name,acao,detalhes:texto(detalhes,2000),...vinculos});}
export const proteger=fn=>async(...args)=>{try{return await fn(...args);}catch(e){console.error(ID,e);ui.notifications.warn(e.message);}};
export const select=(name,rows,selected='')=>`<select name="${esc(name)}">${rows.map(([v,l])=>`<option value="${esc(v)}"${v===selected?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
export const campo=(name,label,value='',type='text')=>`<label class="log-campo">${esc(label)}<input name="${esc(name)}" type="${type}"${type==='number'?' step="any" min="0"':''} value="${esc(value)}"></label>`;
export const area=(name,label,value='')=>`<label class="log-campo log-area">${esc(label)}<textarea rows="5" name="${esc(name)}">${esc(value)}</textarea></label>`;
export const check=(name,label,value=false)=>`<label class="log-checkbox"><input type="checkbox" name="${esc(name)}"${value?' checked':''}>${esc(label)}</label>`;
export async function form(title,content){return foundry.applications.api.DialogV2.prompt({classes:['log-dialog'],window:{title},position:{width:640},content:`<div class="log-form">${content}</div>`,rejectClose:false,ok:{label:'Confirmar',callback:(e,b)=>foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(b.form).object)}});}
export const picks=(f,key,allowed)=>allowed.filter(x=>(f[key]?.[x.id]??f[`${key}.${x.id}`])===true||(f[key]?.[x.id]??f[`${key}.${x.id}`])==='on').map(x=>x.id);
export const choices=(key,rows,selected=[])=>rows.length?rows.map(x=>check(`${key}.${x.id}`,x.name,selected.includes(x.id))).join(''):'<p class="log-vazio">Nenhum usuário ou personagem elegível cadastrado. Mestres têm acesso automático. Para permissões de jogadores, cadastre os usuários no mundo.</p>';
export function imagem(value){const s=texto(value,1500);if(!s)return '';if(/^(https?:\/\/|(?:modules|systems|worlds|icons|assets)\/)/i.test(s))return s;throw Error('Use um caminho de imagem do Foundry ou URL HTTP/HTTPS.');}
