"use strict";(()=>{var Y=`
/* \u2500\u2500\u2500 Design tokens \u2013 Palette BPI France \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.chatbot-wrapper {
	/* Dominante jaune BPI */
	--clr-brand:            #ffcd00;   /* jaune BPI \u2013 couleur dominante */
	--clr-brand-hover:      #f0c000;   /* jaune fonc\xE9 au hover          */
	--clr-navy:             #071a39;   /* navy fonc\xE9 \u2013 texte & accents  */
	--clr-navy-mid:         #0d2f66;   /* navy medium                   */
	/* Boutons blancs (style BPI) */
	--clr-btn-bg:           #ffffff;
	--clr-btn-text:         #071a39;
	--clr-btn-hover-bg:     #f5f7fb;
	/* Surfaces */
	--bg-surface:           #f5f7fb;   /* gris clair BPI */
	--border-color:         #d1d5db;
	--text-muted:           #786e64;   /* warm gray BPI  */
	--clr-accent-bg:        #fffbeb;   /* fond jaune p\xE2le BPI */
	--clr-danger:           #cb2329;   /* rouge BPI      */
	--radius-sm:            6px;
	--radius-md:            8px;
	--radius-lg:            10px;
	--radius-xl:            16px;
	--radius-pill:          24px;
	--transition:           0.2s;

	/* \u2500\u2500\u2500 Wrapper fixe \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
	position: fixed;
	right: 10px;
	bottom: 10px;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 12px;
	z-index: 100;
	pointer-events: auto;
	transition: pointer-events 0.22s;
}

/* \xC9tat ferm\xE9 \u2013 d\xE9sactiver la capture de souris du wrapper */
.chatbot-wrapper.chatbot-closed {
	pointer-events: none;
}

.chatbot-container {
	border-radius: var(--radius-xl);
	box-shadow: 0 4px 24px rgba(0,0,0,0.10);
	width: 600px;
	max-width: 600px;
	max-height: 600px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Les \xE9l\xE9ments de formulaire n'h\xE9ritent pas de font-family par d\xE9faut
   (user agent stylesheet les surcharge) \u2014 on force l'h\xE9ritage */
.chatbot-container button,
.chatbot-container input,
.chatbot-container textarea {
	font-family: inherit;
}

.chatbot-container {
	/* Animation d'ouverture */
	transform-origin: bottom right;
	transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s;
	opacity: 1;
	visibility: visible;
	transform: scale(1) translateY(0);
}

/* \u2500\u2500\u2500 \xC9tat ferm\xE9 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.chatbot-container.chatbot-hidden {
	opacity: 0;
	visibility: hidden;
	transform: scale(0.95) translateY(16px);
	pointer-events: none;
}

/* \u2500\u2500\u2500 Bouton FAB toggle \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.chatbot-toggle-btn {
	width: 52px;
	height: 52px;
	border-radius: 50%;
	border: none;
	background: var(--clr-brand);
	color: var(--clr-navy);
	font-size: 1.5em;
	cursor: pointer;
	box-shadow: 0 4px 16px rgba(7,26,57,0.22);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background 0.18s, transform 0.18s, box-shadow 0.18s,
	            opacity 0.2s ease, visibility 0.2s;
	opacity: 1;
	visibility: visible;
	flex-shrink: 0;
	pointer-events: auto;
}
.chatbot-toggle-btn.chatbot-toggle-hidden {
	opacity: 0;
	display: none;
	pointer-events: none;
	transform: scale(0.8);
}
.chatbot-toggle-btn:hover {
	background: var(--clr-brand-hover);
	transform: scale(1.08);
	box-shadow: 0 6px 20px rgba(7,26,57,0.28);
}

.chatbot-header {
	background: var(--clr-brand);
	color: var(--clr-navy);
	padding: 16px 20px;
	font-size: 1.05em;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.messages-container {
	flex: 1;
	padding: 20px 16px 12px 16px;
	overflow-y: auto;
	background: var(--bg-surface);
	min-height: 400px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.empty-state {
	text-align: center;
	color: #bbb;
	margin-top: 40px;
}
.empty-state-icon {
	font-size: 2.2em;
	margin-bottom: 8px;
}
.empty-state-text {
	font-size: 1.1em;
	font-weight: 500;
}
.empty-state-subtext {
	font-size: 0.95em;
	opacity: 0.8;
}

.message {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	background: #fff;
	border-radius: var(--radius-lg);
	padding: 10px 14px;
	box-shadow: 0 1px 4px rgba(0,0,0,0.04);
	word-break: break-word;
	font-size: 1em;
	position: relative;
}
.message.user {
	align-self: flex-end;
	background: #fff3b0;
}
.message.bot {
	align-self: flex-start;
	background: #fff;
}
.message.system {
	text-align: center;
	background: #f1f1f1;
	color: var(--clr-navy);
	font-style: italic;
}
.message.error {
	background: #ffeaea;
	color: var(--clr-danger);
	border: 1px solid #f5c6cb;
}
.message-content {
	margin-bottom: 4px;
}
.message-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	margin-top: 4px;
	width: 100%;
}
.message-time {
	font-size: 0.8em;
	color: #aaa;
	flex-shrink: 0;
}
.message-time-row {
	display: flex;
	align-items: center;
	gap: 4px;
	margin-left: auto;
}
.copy-btn {
	background: none;
	border: none;
	padding: 6px;
	cursor: pointer;
	color: var(--text-muted);
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius-xl);
	transition: color var(--transition), background var(--transition);
	opacity: 0;
	transition: opacity var(--transition), color var(--transition);
}
.message:hover .copy-btn {
	opacity: 1;
}
.copy-btn:hover {
	color: var(--clr-brand-hover);
	background: var(--bg-surface);
}
.copy-btn.copied {
	background: var(--clr-brand);
	color: var(--bg-surface);
	opacity: 1;
}

.typing-indicator {
	display: flex;
	gap: 3px;
	align-items: center;
	margin: 6px 0 0 2px;
	height: 18px;
}
.typing-indicator span {
	display: inline-block;
	width: 7px;
	height: 7px;
	background: #bbb;
	border-radius: 50%;
	animation: typing-bounce 1.2s infinite ease-in-out both;
}
.typing-indicator span:nth-child(2) {
	animation-delay: 0.2s;
}
.typing-indicator span:nth-child(3) {
	animation-delay: 0.4s;
}
@keyframes typing-bounce {
	0%, 80%, 100% { transform: scale(0.7); opacity: 0.7; }
	40% { transform: scale(1); opacity: 1; }
}

.input-container {
	display: flex;
	align-items: center;
	padding: 14px 16px;
	background: var(--bg-surface);
	border-top: 1px solid #ececec;
	gap: 8px;
}
.input-wrapper {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.input-row {
	display: flex;
	align-items: center;
	gap: 6px;
}
#message-input {
	flex: 1;
	padding: 10px 12px;
	border-radius: var(--radius-md);
	border: 1px solid var(--border-color);
	font-size: 1em;
	outline: none;
	transition: border var(--transition);
	min-width: 0;
}
#message-input:focus {
	box-shadow: 0 0 0 2px rgba(255, 205, 0, 0.35);
}

/* Bouton pi\xE8ce-jointe */
.attach-btn {
	background: none;
	border: 1px solid var(--border-color);
	border-radius: var(--radius-md);
	padding: 8px 10px;
	cursor: pointer;
	color: var(--text-muted);
	line-height: 1;
	flex-shrink: 0;
	transition: border-color var(--transition), color var(--transition), background var(--transition);
	display: flex;
	align-items: center;
	justify-content: center;
}
.attach-btn svg {
	display: block;
}
.attach-btn:hover {
	color: var(--clr-navy);
	background: var(--clr-accent-bg);
}
.attach-btn.has-file {
	border-color: var(--clr-brand);
	color: var(--clr-navy);
	background: #fff3b0;
}

/* Badge fichier s\xE9lectionn\xE9 */
.file-badge {
	display: flex;
	align-items: center;
	gap: 6px;
	background: #fff3b0;
	border: 1px solid var(--clr-brand);
	border-radius: var(--radius-sm);
	padding: 3px 8px;
	font-size: 0.82em;
	color: var(--clr-navy);
	max-width: 100%;
	overflow: hidden;
}
.file-badge-name {
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
}
.file-badge-remove {
	background: none;
	border: none;
	cursor: pointer;
	font-size: 0.95em;
	color: var(--text-muted);
	padding: 0 2px;
	line-height: 1;
	flex-shrink: 0;
	transition: color 0.15s;
}
.file-badge-remove:hover {
	color: var(--clr-danger);
}
#send-button {
	background: var(--clr-brand);
	color: #fff;
	border: none;
	border-radius: 50%;
	padding: 10px;
	cursor: pointer;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 1px 4px rgba(7, 26, 57, 0.15);
	transition: background var(--transition), box-shadow var(--transition), transform var(--transition);
}
#send-button svg {
	display: block;
}
#send-button:hover {
	background: var(--clr-brand-hover);
	box-shadow: 0 2px 8px rgba(7, 26, 57, 0.20);
	transform: scale(1.08);
}


/* Like / Dislike */
.message-feedback {
	gap: 4px;
	flex-shrink: 0;
}
.feedback-btn {
	background: none;
	border: 1px solid #e0e0e0;
	border-radius: var(--radius-sm);
	padding: 2px 7px;
	font-size: 0.85em;
	cursor: pointer;
	line-height: 1.4;
	transition: background 0.15s, border-color 0.15s, transform 0.1s;
	color: var(--text-muted);
}
.feedback-btn:hover {
	background: #fff3b0;
	border-color: var(--clr-brand);
	transform: scale(1.1);
}
.feedback-btn.active {
	background: var(--clr-brand);
	border-color: var(--clr-brand);
	color: var(--clr-navy);
	font-weight: 700;
}

/* Bouton fermer dans le header */
.close-button {
	background: none;
	border: none;
	color: var(--clr-navy);
	border-radius: 50%;
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.15em;
	cursor: pointer;
	transition: background var(--transition);
	flex-shrink: 0;
	opacity: 0.75;
}
.close-button:hover {
	background: rgba(7,26,57,0.12);
	opacity: 1;
}

/* Bouton Reset dans le header */
.reset-button {
	background: var(--clr-brand);
	border: none;
	border-radius: 50%;
	padding: 7px;
	cursor: pointer;
	color: #fff;
	transition: background var(--transition), box-shadow var(--transition), transform var(--transition);
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}
.reset-button svg {
	display: block;
}
.reset-button:hover {
	background: var(--clr-brand-hover);
	box-shadow: 0 2px 8px rgba(7,26,57,0.22);
	transform: rotate(45deg);
}

/* Indicateur de reconnexion */
.reconnect-indicator {
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 8px 14px;
	background: #fffbe6;
	border: 1px solid #ffe58f;
	border-radius: var(--radius-md);
	font-size: 0.92em;
	color: #7c5c00;
	align-self: stretch;
}
.reconnect-spinner {
	width: 14px;
	height: 14px;
	border: 2px solid #ffe58f;
	border-top-color: #d48806;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;
	flex-shrink: 0;
}
@keyframes spin {
	to { transform: rotate(360deg); }
}

/* Carte d'erreur finale */
.error-card {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 6px;
	padding: 18px 16px;
	background: #fff2f2;
	border: 1px solid #ffa39e;
	border-radius: var(--radius-lg);
	text-align: center;
	align-self: stretch;
}
.error-card-icon {
	font-size: 1.8em;
}
.error-card-title {
	font-weight: 700;
	color: var(--clr-danger);
	font-size: 1em;
}
.error-card-text {
	color: #666;
	font-size: 0.9em;
}
.error-card-reload-btn {
	margin-top: 6px;
	background: var(--clr-brand);
	color: var(--clr-navy);
	border: none;
	border-radius: var(--radius-pill);
	padding: 7px 20px;
	font-size: 0.92em;
	font-weight: 700;
	cursor: pointer;
	transition: background var(--transition);
}
.error-card-reload-btn:hover {
	background: var(--clr-brand-hover);
}

/* \u2500\u2500\u2500 Rendu Markdown dans .message-content \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
.message-content h1,
.message-content h2,
.message-content h3,
.message-content h4,
.message-content h5,
.message-content h6 {
	color: var(--clr-navy);
	margin: 0.6em 0 0.3em;
	line-height: 1.3;
	font-weight: 700;
}
.message-content h1 { font-size: 1.15em; }
.message-content h2 { font-size: 1.08em; }
.message-content h3 { font-size: 1em; border-bottom: 1px solid var(--clr-brand); padding-bottom: 2px; }
.message-content h4,
.message-content h5,
.message-content h6 { font-size: 0.95em; }

.message-content p {
	margin: 0.3em 0;
}
.message-content ul,
.message-content ol {
	margin: 0.3em 0 0.3em 1.2em;
	padding: 0;
}
.message-content li {
	margin: 0.15em 0;
}
.message-content hr {
	border: none;
	border-top: 1px solid var(--border-color);
	margin: 0.6em 0;
}
.message-content strong {
	color: var(--clr-navy);
	font-weight: 700;
}
.message-content em {
	color: var(--clr-navy-mid);
}
.message-content code {
	background: #f3f4f6;
	border-radius: 3px;
	padding: 0.1em 0.35em;
	font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
	font-size: 0.88em;
	color: var(--clr-navy);
}
.message-content a {
	color: var(--clr-navy-mid);
	text-decoration: underline;
	word-break: break-all;
}
.message-content a:hover {
	color: var(--clr-brand-hover);
}
.md-table {
    border-collapse: collapse;
    width: 100%;
    margin: 8px 0;
    font-size: 0.85em;
    display: block;
    overflow-x: auto;
}
.md-table th,
.md-table td {
    border: 1px solid var(--border-color);
    padding: 6px 10px;
    text-align: left;
    white-space: nowrap;
}
.md-table th {
    background: var(--clr-accent-bg);
    color: var(--clr-navy);
    font-weight: 600;
}
.md-table tr:nth-child(even) td {
    background: var(--bg-surface);
}
`;function pe(o){return o?"token":"sso"}function z(o){let t=o.getAttribute("token")||void 0;return{token:t,environnement:o.getAttribute("environnement")||"localhost",authMode:pe(t)}}function T(o){return{localhost:"http://localhost:3000/api",staging:"https://apiv2-nprd.cloud.bpifrance.fr/staging/mta/alfred-mini/api",production:"https://apiv2.cloud.bpifrance.fr/prd/mta/alfred-mini/api"}[o]}function R(o){let t=o.authMode==="token"&&o.token;return{headers:t?{Authorization:`Bearer ${o.token}`}:{},credentials:t?"omit":"include"}}async function W(o,t,e){if(o.token)try{let n=await fetch(`${T(o.environnement)}/auth/validate`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${o.token}`}});if(!n.ok){t(`Erreur d'authentification (${n.status}).`,"error"),e();return}let r=await n.json();r.valid||(t(r.error??"Token invalide. Acc\xE8s refus\xE9.","error"),e())}catch{t("Impossible de valider l'authentification.","error"),e()}}function K(o){let t=o.getElementById("message-input"),e=o.getElementById("send-button");t&&(t.disabled=!0),e&&(e.disabled=!0)}var E="agent-dispatcher";function X(o){ge(o).catch(t=>{t instanceof DOMException&&t.name==="AbortError"||(console.error("Send message error:",t),o.hideTypingIndicator(),o.addMessage("Erreur de connexion. Veuillez r\xE9essayer.","error"))})}async function ge(o){let{message:t,config:e,closeSSE:n,setEventSource:r,hideTypingIndicator:s,addMessage:l,updateMessage:a,setReconnectAttempts:p,handleSSEError:d,conversationId:f,agentId:m,file:g}=o;n();let u=crypto.randomUUID(),c=new AbortController;r({close:()=>c.abort()});let h=`${T(e.environnement)}/chat`,{headers:v,credentials:y}=R(e),S={"Correlation-ID":u,"Conversation-ID":f,...v},A,M,I={message:t,agentId:m||E,host:window.location.hostname,file:!!g};if(g){let x=new FormData;x.append("message",I.message),x.append("agentId",I.agentId),x.append("host",I.host),x.append("file",I.file.toString()),x.append("files",g,g.name),A=h,M={method:"POST",headers:S,credentials:y,body:x,signal:c.signal}}else A=h,M={method:"POST",headers:{"Content-Type":"application/json",...S},credentials:y,body:JSON.stringify(I),signal:c.signal};let i=await fetch(A,M);if(!i.ok){l(`Erreur serveur (${i.status}). Veuillez r\xE9essayer.`,"error");return}p(0);let w=i.body.getReader(),U=new TextDecoder,D="",_="",j=null,b=null,q=()=>{b&&clearTimeout(b),b=setTimeout(()=>{l("La connexion a \xE9t\xE9 ferm\xE9e : aucune r\xE9ponse re\xE7ue depuis 60 secondes.","error"),n()},6e4)};for(q();;){let{value:x,done:de}=await w.read();if(de)break;D+=U.decode(x,{stream:!0});let V=D.split(`
`);D=V.pop();for(let G of V){if(!G.trim())continue;let J=G.match(/^data: (.*)$/);if(J){q(),s();try{let k=JSON.parse(J[1]);if(k.type==="chunk"){let le=(k.content??"").replace(/\{"step":"[^"]*"\}/g,"");_+=le,j||(j=l("","bot")),a(j,_)}else if(k.type==="done"){b&&clearTimeout(b),n();return}else if(k.type==="error"){l(k.message??"Une erreur est survenue","error"),b&&clearTimeout(b),n();return}}catch(k){console.error("Parse error:",k)}}}}b&&clearTimeout(b),d()}function Q(o){let{reconnectAttempts:t,setReconnectAttempts:e,addMessage:n,maxReconnectAttempts:r,showReconnecting:s,hideReconnecting:l,showFinalError:a}=o;if(t<r){let p=t+1;e(p),s?s(p,r):n(`Reconnexion en cours... (${p}/${r})`,"system")}else l&&l(),a?a():n("Impossible de se connecter au service. Veuillez rafra\xEEchir la page.","error")}async function Z(o,t,e,n){try{let r=`${T(o.environnement)}/feedback`,{headers:s,credentials:l}=R(o);await fetch(r,{method:"POST",headers:{"Content-Type":"application/json",...s},credentials:l,body:JSON.stringify({type:t,correlationId:e,...n?{agentId:n}:{}})})}catch(r){console.warn("Feedback non envoy\xE9 :",r)}}function ee(o){o.current&&(o.current.close(),o.current=null)}var H=class{constructor(t,e){this.eventSourceRef={current:null};this.reconnectAttempts=0;this.maxReconnectAttempts=5;this.config=t,this.ui=e}updateConfig(t){this.config=t}send(t,e,n=E,r){X({message:t,config:this.config,closeSSE:()=>this.close(),setEventSource:s=>{this.eventSourceRef.current=s},showTypingIndicator:()=>this.ui.showTypingIndicator(),hideTypingIndicator:()=>this.ui.hideTypingIndicator(),addMessage:this.ui.addMessage,updateMessage:this.ui.updateMessage,setReconnectAttempts:s=>{this.reconnectAttempts=s},handleSSEError:()=>this.handleError(),conversationId:e,agentId:n,file:r})}close(){ee(this.eventSourceRef)}handleError(){Q({reconnectAttempts:this.reconnectAttempts,setReconnectAttempts:t=>{this.reconnectAttempts=t},addMessage:this.ui.addMessage,maxReconnectAttempts:this.maxReconnectAttempts,showReconnecting:this.ui.showReconnecting,hideReconnecting:this.ui.hideReconnecting,showFinalError:this.ui.showFinalError})}sendFeedback(t,e,n){Z(this.config,t,e,n)}};function te(o,t,e,n){o([]),t();let r=e.getElementById("messages-container");r&&(r.innerHTML=""),n(crypto.randomUUID())}var B=class{constructor(){this.isFile=!1}async fetchAgentConfig(t){try{let e=T(t.environnement),{headers:n,credentials:r}=R(t),s=await fetch(`${e}/agents`,{headers:n,credentials:r});if(!s.ok)return;let p=((await s.json()).agents??[]).find(d=>d.id===E);this.isFile=p?.isFile??!1}catch{this.isFile=!1}}reset(t,e,n,r){te(t,e,n,r)}get currentAgentId(){return E}};function ne(o){let t=document.createElement("div");return t.textContent=o,t.innerHTML}function L(o){o.scrollTop=o.scrollHeight}function ue(o){return o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function C(o){return ue(o).replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\*(.*?)\*/g,"<em>$1</em>").replace(/`(.*?)`/g,"<code>$1</code>").replace(/\[([^\]]{1,500})\]\(([^)]{1,2000})\)/g,'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')}function P(o){let t=o.split(`
`),e=[],n=!1,r=!1,s=!1,l=!1,a=()=>{n&&(e.push("</ul>"),n=!1),r&&(e.push("</ol>"),r=!1)},p=()=>{s&&(e.push("</tbody></table>"),s=!1,l=!1)};for(let d of t){if(/^\|(.+)\|$/.test(d.trim())){if(a(),/^\|[\s\-:|]+\|$/.test(d.trim()))continue;let u=d.trim().slice(1,-1).split("|").map(c=>c.trim());s?(e.push("<tr>"),e.push(u.map(c=>`<td>${C(c)}</td>`).join("")),e.push("</tr>")):(e.push('<table class="md-table"><thead><tr>'),e.push(u.map(c=>`<th>${C(c)}</th>`).join("")),e.push("</tr></thead><tbody>"),s=!0,l=!0);continue}if(p(),/^-{3,}$/.test(d.trim())){a(),e.push("<hr>");continue}let f=d.match(/^(#{1,6})\s+(.*)/);if(f){a();let u=f[1].length;e.push(`<h${u}>${C(f[2])}</h${u}>`);continue}let m=d.match(/^[-*]\s+(.*)/);if(m){r&&(e.push("</ol>"),r=!1),n||(e.push("<ul>"),n=!0),e.push(`<li>${C(m[1])}</li>`);continue}let g=d.match(/^\d+\.\s+(.*)/);if(g){n&&(e.push("</ul>"),n=!1),r||(e.push("<ol>"),r=!0),e.push(`<li>${C(g[1])}</li>`);continue}if(a(),p(),d.trim()===""){e.push("");continue}e.push(`<p>${C(d)}</p>`)}return a(),p(),e.join(`
`)}function oe(o,t,e="bot",n,r){let s=o.getElementById("messages-container"),l=s.querySelector(".empty-state");l&&l.remove();let a=document.createElement("div");a.className=`message ${e}`;let p=new Date().toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}),d=e=="bot"||e==="user"?`<div class="message-time">${p}</div>`:"",f=e=="bot"||e==="user"?`<button class="copy-btn" title="Copier le message">
			<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
			</svg>
		</button>`:"",m=e==="bot"?`<div class="message-feedback">
			<button class="feedback-btn like-btn" title="Utile">\u{1F44D}</button>
			<button class="feedback-btn dislike-btn" title="Pas utile">\u{1F44E}</button>
		</div>`:"",g=d||m?`<div class="message-footer">${m}<div class="message-time-row">${f}${d}</div></div>`:"",u=e==="bot"?P(t):n(t);if(a.innerHTML=`
		<div class="message-content">${u}</div>
		${g}
	`,e==="bot"){let c=a.querySelector(".like-btn"),h=a.querySelector(".dislike-btn");c.addEventListener("click",()=>{let v=c.classList.contains("active");c.classList.toggle("active"),h.classList.remove("active"),!v&&r&&r("like")}),h.addEventListener("click",()=>{let v=h.classList.contains("active");h.classList.toggle("active"),c.classList.remove("active"),!v&&r&&r("dislike")})}if(e=="bot"||e==="user"){let c=a.querySelector(".copy-btn");c.addEventListener("click",()=>{let h=a.querySelector(".message-content")?.textContent??"";navigator.clipboard.writeText(h).then(()=>{c.classList.add("copied"),setTimeout(()=>c.classList.remove("copied"),1500)})})}return s.appendChild(a),L(s),a}function re(o,t){let e=o.querySelector(".message-content");if(e){o.classList.contains("bot")?e.innerHTML=P(t):e.textContent=t;let n=o.closest(".messages-container");n&&L(n)}}function ie(o){let t=o.getElementById("messages-container");O(o);let e=document.createElement("div");e.className="typing-indicator",e.id="typing-indicator",e.innerHTML="<span></span><span></span><span></span>",t.appendChild(e),L(t)}function O(o){let t=o.getElementById("typing-indicator");t&&t.remove()}function se(o,t,e){F(o);let n=o.getElementById("messages-container"),r=document.createElement("div");r.id="reconnect-indicator",r.className="reconnect-indicator",r.innerHTML=`
		<div class="reconnect-spinner"></div>
		<span>Reconnexion en cours... (${t}/${e})</span>
	`,n.appendChild(r),L(n)}function F(o){let t=o.getElementById("reconnect-indicator");t&&t.remove()}function ae(o){F(o);let t=o.getElementById("messages-container"),e=document.createElement("div");e.className="error-card",e.innerHTML=`
		<div class="error-card-icon">\u26A0\uFE0F</div>
		<div class="error-card-title">Connexion impossible</div>
		<div class="error-card-text">Le service est temporairement indisponible. Veuillez r\xE9essayer plus tard.</div>
		<button class="error-card-reload-btn">Rafra\xEEchir la page</button>
	`,e.querySelector(".error-card-reload-btn").addEventListener("click",()=>window.location.reload()),t.appendChild(e),L(t)}var $=class{constructor(t){this.shadow=t}addMessage(t,e="bot",n){return oe(this.shadow,t,e,ne,n)}updateMessage(t,e){re(t,e)}showTypingIndicator(){ie(this.shadow)}hideTypingIndicator(){O(this.shadow)}showReconnecting(t,e){se(this.shadow,t,e)}hideReconnecting(){F(this.shadow)}showFinalError(){ae(this.shadow)}};var ce="mini-chatbot:conversationId",N=class extends HTMLElement{constructor(){super();this.messages=[];this.attachedFile=null;this.agentService=new B;this.attachShadow({mode:"open"}),this.correlationId=this.generateId(),this.agentService=new B}static get observedAttributes(){return["token","environnement"]}get reconnectAttempts(){return this.sseService?.reconnectAttempts??0}get maxReconnectAttempts(){return this.sseService?.maxReconnectAttempts??5}generateId(){if(typeof crypto<"u"&&typeof crypto.randomUUID=="function")return crypto.randomUUID();let e=new Uint8Array(16);crypto.getRandomValues(e),e[6]=e[6]&15|64,e[8]=e[8]&63|128;let n=Array.from(e,r=>r.toString(16).padStart(2,"0"));return`${n[0]}${n[1]}${n[2]}${n[3]}-${n[4]}${n[5]}-${n[6]}${n[7]}-${n[8]}${n[9]}-${n[10]}${n[11]}${n[12]}${n[13]}${n[14]}${n[15]}`}restoreConversationId(){try{let e=window.sessionStorage.getItem(ce);e?this.correlationId=e:this.persistConversationId(this.correlationId)}catch(e){console.error("[mini-chatbot] restoreConversationId failed:",e)}}persistConversationId(e){try{window.sessionStorage.setItem(ce,e)}catch(n){console.error("[mini-chatbot] persistConversationId failed:",n)}}connectedCallback(){try{this.restoreConversationId(),this.config=z(this),this.render(),this.initServices(),this.initChatbot();let e=this.shadowRoot;W(this.config,(n,r)=>this.uiService.addMessage(n,r),()=>K(e))}catch(e){console.error("[mini-chatbot] init failed:",e)}}attributeChangedCallback(e,n,r){(e==="token"||e==="environnement")&&(this.config=z(this),this.sseService?.updateConfig(this.config))}initServices(){this.uiService=new $(this.shadowRoot),this.sseService=new H(this.config,{showTypingIndicator:()=>this.uiService.showTypingIndicator(),hideTypingIndicator:()=>this.uiService.hideTypingIndicator(),addMessage:(e,n)=>this.uiService.addMessage(e,n,r=>this.sseService.sendFeedback(r,this.correlationId,this.agentService.currentAgentId||void 0)),updateMessage:(e,n)=>this.uiService.updateMessage(e,n),showReconnecting:(e,n)=>this.uiService.showReconnecting(e,n),hideReconnecting:()=>this.uiService.hideReconnecting(),showFinalError:()=>this.uiService.showFinalError()})}render(){this.shadowRoot.innerHTML=`
      <style>${Y}</style>
      <div class="chatbot-wrapper chatbot-closed">
        <div class="chatbot-container chatbot-hidden">
          <div class="chatbot-header">
            <div id="header-left">
              <span>\u{1F4AC} Alfred mini</span>
            </div>
            <div style="display:flex;align-items:center;gap:8px;">
              <button id="reset-button" class="reset-button" title="Nouvelle conversation">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                  <path d="M21 3v5h-5"/>
                  <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                  <path d="M8 16H3v5"/>
                </svg>
              </button>
              <button id="close-button" class="close-button" title="Fermer">\u2715</button>
            </div>
          </div>
        <div class="messages-container" id="messages-container">
          <div class="empty-state">
            <div class="empty-state-icon">\u{1F916}</div>
            <div class="empty-state-text">Bonjour ! Comment puis-je vous aider ?</div>
            <div class="empty-state-subtext">Posez-moi une question pour commencer</div>
          </div>
        </div>
        <div class="input-container">
          <div class="input-wrapper">
            <div class="input-row">
              <button class="attach-btn" id="attach-btn" title="Ajouter une pi\xE8ce jointe" style="display:none">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input type="file" id="file-input" accept=".pdf,.jpg,.jpeg,.png,.doc" style="display:none" />
              <input 
                type="text" 
                id="message-input" 
                placeholder="\xC9crivez votre message..."
                autocomplete="off"
              />
              <button id="send-button" title="Envoyer">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
            <div class="file-badge" id="file-badge" style="display:none">
              <span class="file-badge-name" id="file-badge-name"></span>
              <button class="file-badge-remove" id="file-badge-remove" title="Supprimer la pi\xE8ce jointe">\u2715</button>
            </div>
          </div>
          </div>
        </div>
        <button class="chatbot-toggle-btn" id="chatbot-toggle-btn" title="Ouvrir / Fermer le chatbot">\u{1F4AC}</button>
      </div>
    `}initChatbot(){let e=this.shadowRoot,n=e.getElementById("chatbot-toggle-btn"),r=e.querySelector(".chatbot-container"),s=e.getElementById("close-button"),l=e.querySelector(".chatbot-wrapper"),a=()=>{r.classList.remove("chatbot-hidden"),n.classList.add("chatbot-toggle-hidden"),l.classList.remove("chatbot-closed")},p=()=>{r.classList.add("chatbot-hidden"),n.classList.remove("chatbot-toggle-hidden"),l.classList.add("chatbot-closed")};n.addEventListener("click",()=>{r.classList.contains("chatbot-hidden")?a():p()}),s.addEventListener("click",i=>{i.preventDefault(),i.stopPropagation(),p()});let d=e.getElementById("message-input"),f=e.getElementById("send-button"),m=e.getElementById("attach-btn"),g=e.getElementById("file-input"),u=e.getElementById("file-badge"),c=e.getElementById("file-badge-name"),h=e.getElementById("file-badge-remove"),v=["pdf","jpg","jpeg","png","doc"],y=i=>{this.attachedFile=i,i?(c.textContent=i.name,u.style.display="flex",m.classList.add("has-file")):(u.style.display="none",c.textContent="",m.classList.remove("has-file"),g.value="")};m.addEventListener("click",()=>g.click()),g.addEventListener("change",()=>{let i=g.files?.[0]??null;if(!i)return;let w=i.name.split(".").pop()?.toLowerCase()??"";if(!v.includes(w)){S(`Format non support\xE9. Extensions autoris\xE9es : ${v.join(", ")}.`,"error"),g.value="";return}y(i)}),h.addEventListener("click",()=>y(null));let S=(i,w)=>this.uiService.addMessage(i,w,U=>this.sseService.sendFeedback(U,this.correlationId,this.agentService.currentAgentId||void 0)),A=()=>this.agentService.reset(i=>{this.messages=i},()=>this.sseService.close(),this.shadowRoot,i=>{this.correlationId=i,this.persistConversationId(i)}),M=()=>{let i=d.value.trim();if(!i)return;d.value="";let w=this.attachedFile;y(null),S(i,"user"),this.uiService.showTypingIndicator(),this.sseService.send(i,this.correlationId,void 0,w)};f.addEventListener("click",M),d.addEventListener("keydown",i=>{i.key==="Enter"&&M()}),e.getElementById("reset-button").addEventListener("click",()=>{y(null),A(),S("Nouvelle conversation d\xE9marr\xE9e.","system")}),this.agentService.fetchAgentConfig(this.config).then(()=>{let i=this.agentService.isFile;m.style.display=i?"":"none",g.style.display="none",i||(y(null),u.style.display="none")})}};customElements.get("mini-chatbot")||customElements.define("mini-chatbot",N);})();
