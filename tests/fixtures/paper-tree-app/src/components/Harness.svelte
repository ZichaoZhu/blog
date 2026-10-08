<script lang="ts">
import PaperTreeCanvas from '../../../../../src/features/paper-trees/PaperTreeCanvas.svelte';
import {createPaperTree} from '../../../../../src/features/paper-trees/template';
import {wideDraft} from '../../../paper-trees';
import {flattenTree,type TreeData,type TreeCommand} from '../../../../../src/features/paper-trees/model';
let {editable,count}:{editable:boolean;count:number}=$props();
let data=count ? wideDraft(count).tree : createPaperTree('fixture','template').tree;
if(count) data.nodeData.children![0].topic=String.raw`$r_{bound}=1$ $\frac{1}{a-1}$`;
else {data.nodeData.children![0].children![1].note='父节点说明';data.nodeData.children![0].children![3].hyperLink='#method';}
let canvas:PaperTreeCanvas;
let mounted=$state(true);
let exported=$state(JSON.stringify(data));
let error=$state('');
function change(tree:TreeData){exported=JSON.stringify(tree);}
async function run(action:TreeCommand){try{await canvas.command(action);exported=JSON.stringify(canvas.exportData());error='';}catch(e){error=(e as Error).message;}}
</script>
<button onclick={()=>mounted=!mounted}>切换挂载</button>
{#if editable}
<button onclick={()=>run({type:'addChild',nodeId:data.nodeData.id})}>添加测试子节点</button>
<button onclick={()=>run({type:'clone',nodeId:data.nodeData.children![0].id})}>复制测试分支</button>
<button onclick={()=>run({type:'edit',nodeId:data.nodeData.id,patch:{note:'NEW_NOTE'}})}>修改测试说明</button>
<button onclick={()=>run({type:'move',nodeId:data.nodeData.children![0].id,parentId:flattenTree(data)[2].node.id,index:0})}>移动到后代测试</button>
{/if}
<p role="status">{error}</p>
{#if mounted}<PaperTreeCanvas bind:this={canvas} tree={data} {editable} onchange={change}/>{/if}
<pre data-testid="export-data" style="white-space:pre-wrap;overflow-wrap:anywhere">{exported}</pre>
