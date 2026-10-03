import type {Root,Text,PhrasingContent} from 'mdast';
import {visit} from 'unist-util-visit';
export function remarkTyporaCompat(): (tree:Root)=>void {
 return tree=>{
  visit(tree,'paragraph',(node,index,parent)=>{
   if(parent&&typeof index==='number'&&node.children.length===1&&node.children[0].type==='text'&&/^\[toc\]$/i.test(node.children[0].value.trim())){parent.children.splice(index,1);return index;}
  });
  visit(tree,'heading',node=>{if(node.depth===1)node.depth=2;});
  visit(tree,'code',node=>{if(node.lang)node.lang=node.lang==='C++'?'cpp':node.lang.toLowerCase();});
  visit(tree,'delete',node=>{
   const start=node.position?.start.offset,end=node.position?.end.offset;
   const innerStart=node.children[0]?.position?.start.offset,innerEnd=node.children.at(-1)?.position?.end.offset;
   if(start!==undefined&&end!==undefined&&innerStart!==undefined&&innerEnd!==undefined&&end-start-(innerEnd-innerStart)===2)node.data={...node.data,hName:'sub'};
  });
  visit(tree,'text',(node:Text,index,parent)=>{
   if(!parent||typeof index!=='number')return;
   const pattern=/==([^=\n]+)==|(?<!~)~([^~\n]+)~(?!~)|\^([^\^\n]+)\^/g;
   const result:PhrasingContent[]=[];let end=0;
   for(const match of node.value.matchAll(pattern)){
    if(match.index!>end)result.push({type:'text',value:node.value.slice(end,match.index)});
    const value=match[1]??match[2]??match[3],tag=match[1]?'mark':match[2]?'sub':'sup';
    result.push({type:'strong',children:[{type:'text',value}],data:{hName:tag}});end=match.index!+match[0].length;
   }
   if(!result.length)return;
   if(end<node.value.length)result.push({type:'text',value:node.value.slice(end)});
   (parent.children as PhrasingContent[]).splice(index,1,...result);return index+result.length;
  });
 };
}
