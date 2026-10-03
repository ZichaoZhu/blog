import {existsSync,realpathSync} from 'node:fs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,relative,dirname,extname} from 'node:path';
import {createHash} from 'node:crypto';
import type {Root,Image,RootContent,PhrasingContent} from 'mdast';
import type {Element,Properties} from 'hast';
import type {VFile} from 'vfile';
import {visit} from 'unist-util-visit';
import {fromHtml} from 'hast-util-from-html';
declare module 'mdast' { interface Data { hName?:string; hProperties?:Properties } }
export function resolveLocalImage(src:string,sourceFile:string,contentRoot:string):string {
 let path=src.split(/[?#]/)[0];try{path=decodeURIComponent(path);}catch{ /* Literal percent filenames remain valid. */ }
 const root=realpathSync(contentRoot),candidate=resolve(dirname(sourceFile),path);
 if(relative(resolve(contentRoot),candidate).startsWith('..'))throw new Error(`image outside content root: ${src}`);
 if(!existsSync(candidate))throw new Error(`missing image ${src} in ${sourceFile}`);
 const actual=realpathSync(candidate);
 if(relative(root,actual).startsWith('..'))throw new Error(`image symlink escapes content root: ${src}`);
 return candidate;
}
export function remarkLocalImages(options:{contentRoot:string;originalsRoot?:string}): (tree:Root,file:VFile)=>Promise<void> {
 return async (tree,file)=>{
  const sourceFile=file.path;if(!sourceFile)throw new Error('Local images require source filepath');
  // Typora accepts standalone image destinations with unescaped spaces/parentheses.
  // CommonMark leaves these as text; recover only verified local image paragraphs.
  visit(tree,'paragraph',node=>{
   if(node.children.length!==1||node.children[0].type!=='text')return;
   const match=/^!\[([^\]\n]*)\]\((.+)\)$/.exec(node.children[0].value.trim());
   if(!match||/^(https?:|data:|\/\/)/i.test(match[2])||! /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(match[2]))return;
   resolveLocalImage(match[2],sourceFile,options.contentRoot);
   node.children=[{type:'image',url:match[2],alt:match[1]}];
  });
  visit(tree,'html' ,(node,index,parent)=>{
   if(!parent||typeof index!=='number'||!/<img\b/i.test(node.value))return;
   const parsed=fromHtml(node.value,{fragment:true}),parts:PhrasingContent[]=[];let end=0;
   visit(parsed,'element',(element:Element)=>{
    if(element.tagName!=='img')return;
    const start=element.position?.start.offset,finish=element.position?.end.offset;
    if(start===undefined||finish===undefined)return;
    if(start>end)parts.push({type:'html',value:node.value.slice(end,start)});
    const {src,...props}=element.properties;
    parts.push({type:'image',url:String(src??''),alt:String(props.alt??''),data:{hProperties:props}});end=finish;
   });
   if(!parts.length)return;
   if(end<node.value.length)parts.push({type:'html',value:node.value.slice(end)});
   const replacement=parent.type==='root'?[{type:'paragraph',children:parts} as RootContent]:parts;
   (parent.children as (RootContent|PhrasingContent)[]).splice(index,1,...replacement);return index+replacement.length;
  });
  const images:{node:Image;parent:{children:unknown[];type:string};index:number}[]=[];
  visit(tree,'image',(node,index,parent)=>{if(parent&&typeof index==='number')images.push({node,parent,index});});
  for(const {node} of images){
   if(/^(https?:|data:|\/\/)/i.test(node.url))continue;
   const source=resolveLocalImage(node.url,sourceFile,options.contentRoot),bytes=await readFile(source);
   const name=createHash('sha256').update(bytes).digest('hex')+extname(source),original=`/images/original/${name}`;
   const target=resolve(options.originalsRoot??'public','images/original',name);await mkdir(dirname(target),{recursive:true});await writeFile(target,bytes);
   node.url=encodeURI(relative(dirname(sourceFile),source).replaceAll('\\','/'));node.data??={};node.data.hProperties={...node.data.hProperties,'data-source-asset':relative(resolve(options.contentRoot),source).replaceAll('\\','/'),'data-original-url':original};
  }
 };
}
