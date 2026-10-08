<script lang="ts">
	import { onMount } from "svelte";
	import type MindElixir from "mind-elixir";
	import type { NodeObj, Topic, Theme } from "mind-elixir";
	import "mind-elixir/style.css";
	import "katex/dist/katex.min.css";
	import "./paper-tree.css";
	import {cloneBranch, flattenTree, validateDraft, type TreeData, type TreeNode, type TreeCommand} from "./model";
	import {renderNodeMarkdown} from "./render";

	interface Props {tree: TreeData; editable: boolean; onchange?: (tree:TreeData)=>void; onselect?: (nodeId:string)=>void}
	let {tree, editable, onchange, onselect}: Props = $props();
	let host: HTMLDivElement;
	let shell: HTMLDivElement;
	let engine: MindElixir | undefined;
	let ready = $state(false);
	let error = $state("");
	let selected = $state<TreeNode | null>(null);
	let currentTree = structuredClone(tree);
	let disposed = false;

	function clean(data: TreeData): TreeData {
		return validateDraft({schemaVersion:1, paperId:"canvas", templateId:null, updatedAt:new Date().toISOString(), tree:data}, "canvas").tree;
	}
	function toNative(node: TreeNode): NodeObj {
		return {...node, style: node.style ? {...node.style, fontSize: node.style.fontSize ? `${node.style.fontSize}px` : undefined, fontWeight: node.style.fontWeight?.toString()} : undefined, children:node.children?.map(toNative)};
	}
	function fromNative(node: NodeObj): TreeNode {
		return {id:node.id, topic:node.topic, ...(node.note !== undefined ? {note:node.note}:{}), ...(node.hyperLink ? {hyperLink:node.hyperLink}:{}), ...(node.expanded !== undefined ? {expanded:node.expanded}:{}), ...(node.children ? {children:node.children.map(fromNative)}:{}), ...(node.style ? {style:{...(node.style.fontSize ? {fontSize:Number.parseInt(node.style.fontSize) as 22|18|14|12}:{}), ...(node.style.fontWeight ? {fontWeight:Number.parseInt(node.style.fontWeight) as 400|700}:{}), ...(node.style.color ? {color:node.style.color}:{}), ...(node.style.background ? {background:node.style.background}:{})}}:{})};
	}
	function initialData(data: TreeData): {nodeData:NodeObj; direction:1} {
		const copy = clean(data);
		if (!editable) for (const {node, depth} of flattenTree(copy)) node.expanded = depth < 2;
		return {direction:1, nodeData:toNative(copy.nodeData)};
	}
	export function exportData(): TreeData {
		return engine ? clean({direction:1, nodeData:fromNative(engine.getData().nodeData)}) : clean(currentTree);
	}
	export function replaceData(data: TreeData): void {
		currentTree = clean(data);
		selected = null;
		engine?.refresh(initialData(currentTree));
		engine?.clearHistory?.();
		decorate();
	}
	function notify(): void {
		decorate();
		try {const next=exportData();if(JSON.stringify(next)!==JSON.stringify(currentTree)){currentTree=next;onchange?.(currentTree);} error="";}
		catch(e) {error=e instanceof Error ? e.message : "节点数据无效，请撤销本次修改。";}
	}
	function topic(id: string): Topic {
		if (!engine) throw new Error("画布尚未就绪。");
		const path: string[] = [];
		function find(node:NodeObj): boolean {if(node.id===id) return true; for(const child of node.children??[]) if(find(child)) {path.unshift(node.id); return true;} return false;}
		if (!find(engine.nodeData)) throw new Error("找不到该节点。");
		for (const ancestor of path) {const element=engine.findEle(ancestor); if(element?.nodeObj.expanded===false) engine.expandNode(element,true);}
		return engine.findEle(id);
	}
	export async function command(action:TreeCommand): Promise<void> {
		if (!editable || !engine) throw new Error("只读画布不能编辑。");
		if(action.type==="undo" || action.type==="redo") {engine[action.type](); notify(); return;}
		const element=topic(action.nodeId);
		const data=exportData();
		const entry=flattenTree(data).find(({node})=>node.id===action.nodeId);
		if(!entry) throw new Error("找不到该节点。");
		const node=entry.node;
		if(["remove","clone","addSibling","move"].includes(action.type) && !entry.parentId) throw new Error("根节点不能删除、复制、移动或添加同级。");
		if(action.type==="addChild" || action.type==="addSibling" || action.type==="clone") {
			const count=flattenTree(data).length+(action.type==="clone" ? flattenTree({nodeData:node,direction:1}).length : 1);
			if(count>500) throw new Error("解析树最多包含 500 个节点。");
			const inserted=action.type==="clone" ? cloneBranch(node) : {id:crypto.randomUUID(),topic:"新节点"};
			const parent=action.type==="addChild" ? node : flattenTree(data).find(({node:n})=>n.id===entry.parentId)?.node;
			if(!parent) throw new Error("找不到父节点。");
			(parent.children??=[]).push(inserted); clean(data);
			if(action.type==="addChild") await engine.addChild(element,toNative(inserted));
			else await engine.insertSibling("after",element,toNative(inserted));
		} else if(action.type==="remove") {await engine.removeNodes([element]);}
		else if(action.type==="edit") {
			const patch={...action.patch};
			Object.assign(node,patch);
			if(patch.hyperLink==="") delete node.hyperLink;
			clean(data);
			await engine.reshapeNode(element,patch);
		} else if(action.type==="move") {
			if(flattenTree({nodeData:node,direction:1}).some(({node:n})=>n.id===action.parentId)) throw new Error("不能移动到自己或自己的后代。");
			const parent=flattenTree(data).find(({node:n})=>n.id===action.parentId)?.node;
			const oldParent=flattenTree(data).find(({node:n})=>n.id===entry.parentId)?.node;
			if(!parent || !oldParent || !Number.isInteger(action.index) || action.index<0) throw new Error("移动位置无效。");
			oldParent.children=oldParent.children?.filter(n=>n.id!==node.id);
			(parent.children??=[]).splice(action.index,0,node); clean(data);
			const nativeParent=topic(parent.id);
			const siblings=(nativeParent.nodeObj.children??[]).filter(n=>n.id!==node.id);
			if(action.index<siblings.length) await engine.moveNodeBefore([element],topic(siblings[action.index].id));
			else if(siblings.length) await engine.moveNodeAfter([element],topic(siblings.at(-1)!.id));
			else await engine.moveNodeIn([element],nativeParent);
		}
		notify();
	}
	function details(node:NodeObj): void {selected=fromNative(node); onselect?.(node.id);}
	function toggle(element:Topic, expanded?:boolean): void {
		if(!engine) return;
		if(element.nodeObj===engine.nodeData) {
			engine.nodeData.expanded=expanded ?? engine.nodeData.expanded===false;
			decorate(); if(editable) notify();
		} else engine.expandNode(element,expanded);
	}
	function decorate(): void {
		if(!engine || !host) return;
		host.classList.toggle("paper-tree-root-collapsed",engine.nodeData.expanded===false);
		for(const el of host.querySelectorAll<Topic>("me-tpc")) {
			const node=el.nodeObj;
			el.setAttribute("role","treeitem"); el.setAttribute("tabindex","0"); el.setAttribute("aria-label",node.topic);
			if(node.children?.length) el.setAttribute("aria-expanded",String(node.expanded!==false)); else el.removeAttribute("aria-expanded");
			if(!el.querySelector(".paper-node-details")) {
				const button=document.createElement("button"); button.type="button"; button.className="btn-plain paper-node-details"; button.setAttribute("aria-label","查看节点说明"); button.textContent="ⓘ"; el.append(button);
			}
			if(el.link) {el.link.setAttribute("aria-label","打开节点链接"); el.link.setAttribute("rel","noopener noreferrer"); el.link.setAttribute("tabindex","0"); if(node.hyperLink?.startsWith("#")||node.hyperLink?.startsWith("/")) el.link.removeAttribute("target");}
			const expander=el.expander??el.parentElement.querySelector<HTMLElement>("me-epd");
			if(expander) {expander.setAttribute("role","button");expander.setAttribute("tabindex","0");expander.setAttribute("aria-label",node.expanded===false ? "展开分支" : "收起分支");expander.setAttribute("aria-expanded",String(node.expanded!==false));}
		}
	}
	function click(event:MouseEvent): void {
		const target=event.target as HTMLElement;
		if(target.closest("a")) {event.stopPropagation(); return;}
		const el=target.closest<Topic>("me-tpc");
		if(!el) return;
		if(target.closest(".paper-node-details")) {event.stopPropagation(); details(el.nodeObj); return;}
		if(!editable) {event.stopPropagation(); if(el.nodeObj.children?.length) {toggle(el);decorate();} else details(el.nodeObj);}
	}
	function keyboard(event:KeyboardEvent): void {
		const target=event.target as HTMLElement;
		const expander=target.closest("me-epd");
		if(expander && ["Enter"," "].includes(event.key)) {event.preventDefault();event.stopPropagation();const element=expander.previousElementSibling as Topic;toggle(element);decorate();return;}
		if(target.closest("a,button,[contenteditable=true],textarea,input")) return;
		const el=target.closest<Topic>("me-tpc");
		if(el && ["Enter"," ","ArrowLeft","ArrowRight"].includes(event.key)) {
			event.preventDefault(); event.stopPropagation();
			if(el.nodeObj.children?.length) toggle(el,event.key==="ArrowLeft" ? false : event.key==="ArrowRight" ? true : undefined); else details(el.nodeObj);
			decorate(); if(editable) notify();
		}
		if(editable && (event.ctrlKey||event.metaKey) && ["z","y"].includes(event.key.toLowerCase())) queueMicrotask(()=>{if(!disposed) notify();});
	}
	function theme(base:Theme):Theme {
		const dark=document.documentElement.classList.contains("dark");
		return {...base,name:"Goongmly",type:dark?"dark":"light",palette:Array(5).fill("var(--primary)"),cssVar:{...base.cssVar,"--color":"var(--deep-text)","--bgcolor":"var(--card-bg)","--main-color":"var(--deep-text)","--main-bgcolor":"var(--btn-regular-bg)","--main-bgcolor-transparent":"var(--btn-regular-bg)","--selected":"var(--primary)","--accent-color":"var(--primary)","--root-bgcolor":"var(--btn-regular-bg)","--root-color":"var(--btn-content)","--root-border-color":"var(--primary)","--node-gap-x":"24px","--node-gap-y":"10px","--main-gap-y":"16px","--main-radius":"12px","--root-radius":"12px","--topic-padding":"10px 12px"}};
	}
	onMount(()=>{
		disposed=false;
		let observer:MutationObserver|undefined;
		let resize:ResizeObserver|undefined;
		let cancelAnimation=0;
		const teardown=()=>{disposed=true; cancelAnimationFrame(cancelAnimation);observer?.disconnect();resize?.disconnect();host?.removeEventListener("click",click,true);host?.removeEventListener("keydown",keyboard,true);engine?.destroy();engine=undefined;ready=false;selected=null;};
		void import("mind-elixir").then(({default:Core})=>{
			if(disposed) return;
			engine=new Core({el:host,direction:Core.RIGHT,editable,contextMenu:false,toolBar:false,keypress:false,allowUndo:editable,newTopicName:"新节点",markdown:renderNodeMarkdown,theme:theme(Core.THEME),scaleMin:0.1,scaleMax:3,handleWheel(event){if(event.ctrlKey||event.metaKey){event.preventDefault();engine?.scale(engine.scaleVal*(event.deltaY>0?0.9:1.1),{x:event.clientX,y:event.clientY});}},pasteHandler(event){event.preventDefault();}});
			const failure=engine.init(initialData(currentTree));if(failure) throw failure;
			engine.bus.addListener("operation",notify);
			engine.bus.addListener("selectNodes",nodes=>{if(nodes[0]){selected=fromNative(nodes[0]);onselect?.(nodes[0].id);}});
			engine.bus.addListener("expandNode",()=>{decorate();if(editable) notify();});
			engine.bus.addListener("linkDiv",decorate);
			host.addEventListener("click",click,true);host.addEventListener("keydown",keyboard,true);
			observer=new MutationObserver(()=>engine?.changeTheme(theme(Core.THEME)));observer.observe(document.documentElement,{attributes:true,attributeFilter:["class","style"]});
			resize=new ResizeObserver(()=>{if(engine) engine.toCenter();});resize.observe(host);
			decorate();ready=true;
			cancelAnimation=requestAnimationFrame(()=>{if(engine && flattenTree(currentTree).length<=60) {engine.scaleFit();}});
		}).catch(e=>{if(!disposed){error=e instanceof Error ? e.message : "解析树暂时无法加载，请查看文字大纲。";engine?.destroy();engine=undefined;}});
		return teardown;
	});
	async function fullscreen():Promise<void> {if(document.fullscreenElement) await document.exitFullscreen();else await shell.requestFullscreen?.();}
</script>

<div class="paper-tree-canvas" bind:this={shell} data-ready={ready} data-pagefind-ignore="all">
	<div class="paper-tree-toolbar" aria-label="解析树操作">
		<button type="button" class="btn-plain knowledge-action" disabled={!ready} onclick={()=>engine?.scale(engine.scaleVal*1.2)} aria-label="放大">＋</button>
		<button type="button" class="btn-plain knowledge-action" disabled={!ready} onclick={()=>engine?.scale(engine.scaleVal/1.2)} aria-label="缩小">−</button>
		<button type="button" class="btn-plain knowledge-action" disabled={!ready} onclick={()=>engine?.scaleFit()}>适应画布</button>
		<button type="button" class="btn-plain knowledge-action" disabled={!ready} onclick={()=>{engine?.scale(1);engine?.toCenter();}}>原始大小</button>
		<button type="button" class="btn-plain knowledge-action" onclick={fullscreen}>全屏</button>
		{#if editable}
			<button type="button" class="btn-plain knowledge-action" disabled={!ready} onclick={()=>command({type:"undo"})}>撤销</button>
			<button type="button" class="btn-plain knowledge-action" disabled={!ready} onclick={()=>command({type:"redo"})}>重做</button>
		{/if}
	</div>
	<p class="paper-tree-help">点击节点{editable?"选中，双击编辑文字":"展开分支"}；ⓘ 查看说明。按住 Ctrl / ⌘ 滚轮缩放。</p>
	{#if error}<p role="alert">{error}</p>{/if}
	<div class="paper-tree-host" bind:this={host} role="tree" aria-label="论文解析树" aria-readonly={!editable}></div>
	{#if selected}
		<section class="paper-tree-details" aria-label="节点详情">
			<div class="paper-tree-toolbar"><strong>节点详情</strong><button type="button" class="btn-plain knowledge-action" onclick={()=>selected=null}>关闭详情</button></div>
			<div class="paper-tree-richtext">{@html renderNodeMarkdown(selected.topic)}</div>
			{#if selected.note}<div class="paper-tree-richtext">{@html renderNodeMarkdown(selected.note)}</div>{/if}
			{#if selected.hyperLink}<a class="btn-plain knowledge-action" href={selected.hyperLink} rel="noopener noreferrer">打开节点链接</a>{/if}
		</section>
	{/if}
</div>
