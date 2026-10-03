import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function backupWorkspace(sourceRoot:string,backupRoot:string) {
 sourceRoot=resolve(sourceRoot); backupRoot=resolve(backupRoot);
 const git=(...args:string[])=>execFileSync('git',args,{cwd:sourceRoot,encoding:'utf8'});
 const paths=[...new Set(git('ls-files','-z','--cached','--others','--exclude-standard').split('\0').filter(Boolean))];
 const files:{path:string;sha256:string}[]=[];
 const deletedTrackedFiles:string[]=[];
 const pending:{path:string;bytes:Buffer}[]=[];
 for(const path of paths) {
  if(path.startsWith('.worktrees/')||path.startsWith('.superpowers/')||path.startsWith('node_modules/')||path.startsWith('.next/'))continue;
  const input=resolve(sourceRoot,path);
  if(relative(sourceRoot,input).startsWith('..'))throw new Error(`outside source: ${path}`);
  let bytes:Buffer;
  try{if(!(await stat(input)).isFile())continue; bytes=await readFile(input);}
  catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT'){deletedTrackedFiles.push(path);continue;}throw error;}
  if(/\.(png|jpe?g|webp|gif|mp[34])$/i.test(path)&&bytes.subarray(0,80).toString().startsWith('version https://git-lfs.github.com/spec/v1'))throw new Error(`LFS pointer instead of asset: ${path}`);
  files.push({path,sha256:createHash('sha256').update(bytes).digest('hex')});pending.push({path,bytes});
 }
 await mkdir(backupRoot,{recursive:false});
 for(const item of pending){const output=resolve(backupRoot,'files',item.path);await mkdir(dirname(output),{recursive:true});await copyFile(resolve(sourceRoot,item.path),output);}
 const result={files,deletedTrackedFiles,sourceHead:git('rev-parse','HEAD').trim()};
 await writeFile(resolve(backupRoot,'manifest.json'),JSON.stringify(result,null,2)+'\n');
 await writeFile(resolve(backupRoot,'tracked.patch'),git('diff','HEAD','--binary'));
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);const value=(key:string)=>args[args.indexOf(key)+1];
 if(!args.includes('--source-root')||!args.includes('--backup-root'))throw new Error('Required --source-root and --backup-root');
 const result=await backupWorkspace(value('--source-root'),value('--backup-root'));
 console.log(JSON.stringify({files:result.files.length,deleted:result.deletedTrackedFiles.length,sourceHead:result.sourceHead}));
}
