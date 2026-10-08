import assert from "node:assert/strict";
import {mkdtemp, mkdir, writeFile, rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import test from "node:test";
import {loadPublicTrees, readPublicTreeInput, emitPublicTrees, treeHeading, studioEditorUrl, type PublicTreeInput} from "../../src/features/paper-trees/public-build";
import {toPublicSnapshot} from "../../src/features/paper-trees/model";
import {draftFixture} from "../fixtures/paper-trees";
import {makeNote} from "../fixtures/notes";

const ids = ["c8e2da5d-545e-4ed1-944c-9d54e91b8488","773b77a0-b633-4d5e-bcf5-bdb1be74d718","c6037e6e-371b-4af0-bc08-7b918d6f648f"];
function inputFixture():PublicTreeInput {
	return {release:{schemaVersion:1,releaseId:ids[0],parentReleaseId:null,codeSha:"a".repeat(40),createdAt:"2026-10-08T01:00:00.000Z",entries:{"paper/中文":ids[0],private:ids[1],draft:ids[2]}},snapshots:[toPublicSnapshot(draftFixture(),ids[0],"2026-10-08T01:00:00.000Z"),toPublicSnapshot(draftFixture("private"),ids[1],"2026-10-08T01:00:00.000Z"),toPublicSnapshot(draftFixture("draft"),ids[2],"2026-10-08T01:00:00.000Z")]};
}
const notes=[makeNote({id:"paper/中文",type:"paper"}),makeNote({id:"private",type:"paper",visibility:"unlisted"}),makeNote({id:"draft",type:"paper",visibility:"draft"})];

test("public trees bind stable IDs and drop every current or historical private paper",()=>{
	const input=inputFixture();
	assert.deepEqual([...loadPublicTrees(input,notes).keys()],["paper/中文"]);
	assert.deepEqual([...loadPublicTrees(input,[...notes.slice(1),makeNote({id:"paper/中文",type:"paper",slug:"renamed",title:"renamed"})]).keys()],["paper/中文"]);
	assert.equal(loadPublicTrees(input,notes.map(n=>({...n,data:{...n.data,type:"course"}}))).size,0);
	const old=toPublicSnapshot(draftFixture(),"8a686d68-53c3-475b-8dbb-0fef7ed68e45","2026-10-07T01:00:00.000Z");
	input.snapshots.push(old);
	assert.equal(loadPublicTrees(input,notes).get("paper/中文")?.snapshotId,ids[0]);
});

test("missing, duplicate, mismatched and private-field snapshots fail closed",()=>{
	const missing=inputFixture(); missing.snapshots.shift();
	assert.throws(()=>loadPublicTrees(missing,notes));
	const duplicate=inputFixture();duplicate.snapshots.push(duplicate.snapshots[0]);
	assert.throws(()=>loadPublicTrees(duplicate,notes));
	const mismatch=inputFixture();mismatch.snapshots[0].paperId="private";
	assert.throws(()=>loadPublicTrees(mismatch,notes));
	const unknown=inputFixture();unknown.release.entries.forged=ids[0];
	assert.throws(()=>loadPublicTrees(unknown,notes));
	for(const insert of [(i:PublicTreeInput)=>Object.assign(i.snapshots[0],{privateNote:"DRAFT_SECRET"}),(i:PublicTreeInput)=>Object.assign(i.snapshots[0].tree.nodeData,{metadata:{private:"DRAFT_SECRET"}})]){
		const input=inputFixture();insert(input);assert.throws(()=>loadPublicTrees(input,notes));
	}
	const bad=inputFixture();bad.release.schemaVersion=2 as 1;assert.throws(()=>loadPublicTrees(bad,notes));
});

test("an enabled build cannot silently omit input in either mode, disabled local builds remain valid",async()=>{
	const dir=await mkdtemp(join(tmpdir(),"paper-input-"));
	try{
		assert.equal(await readPublicTreeInput(dir,false,"preview"),null);
		await assert.rejects(()=>readPublicTreeInput(dir,true,"production"));
		await assert.rejects(()=>readPublicTreeInput(dir,true,"preview"));
		const input=inputFixture();await mkdir(join(dir,"snapshots"));
		await writeFile(join(dir,"release.json"),JSON.stringify(input.release));
		for(const snapshot of input.snapshots) await writeFile(join(dir,"snapshots",`${snapshot.snapshotId}.json`),JSON.stringify(snapshot));
		await writeFile(join(dir,"snapshots","unknown-private.json"),"DRAFT_SECRET");
		assert.equal((await readPublicTreeInput(dir,true,"production"))?.snapshots.length,3);
		await rm(join(dir,"snapshots",`${ids[0]}.json`));
		await assert.rejects(()=>readPublicTreeInput(dir,true,"production"));
	}finally{await rm(dir,{recursive:true,force:true});}
});

test("emission writes only whitelisted public snapshots and a minimal release receipt",async()=>{
	const dir=await mkdtemp(join(tmpdir(),"paper-output-"));
	try{
		const input=inputFixture();
		input.snapshots.push(toPublicSnapshot(draftFixture("private"),"8a686d68-53c3-475b-8dbb-0fef7ed68e45","2026-10-07T01:00:00.000Z"));
		await emitPublicTrees(dir,input,notes);
		const {readFile,readdir}=await import("node:fs/promises");
		assert.deepEqual(await readdir(join(dir,"paper-trees","snapshots")),[`${ids[0]}.json`]);
		const receipt=JSON.parse(await readFile(join(dir,"paper-trees","release.json"),"utf8"));
		assert.deepEqual(Object.keys(receipt).sort(),["codeSha","publishedAt","releaseId","schemaVersion"]);
		assert.equal(receipt.releaseId,ids[0]);
	}finally{await rm(dir,{recursive:true,force:true});}
});

test("article anchors avoid body collisions and editor URLs hash special paper IDs on the server",()=>{
	assert.equal(treeHeading([]).slug,"paper-analysis-tree");
	assert.equal(treeHeading([{slug:"paper-analysis-tree"},{slug:"paper-analysis-tree-2"}]).slug,"paper-analysis-tree-3");
	assert.equal(studioEditorUrl(undefined,"paper/中文"),null);
	assert.throws(()=>studioEditorUrl("http://evil.test","paper/中文"));
	const url=studioEditorUrl("https://studio.blessingworld.cn","paper/中文");
	assert.match(url!,/^https:\/\/studio\.blessingworld\.cn\/studio\/paper-trees\/[a-f\d]{64}\/$/);
	assert.equal(url?.includes("中文"),false);
});
