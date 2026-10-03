import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeNote} from '../fixtures/notes';
import {orderCourseNotes,getCourseNeighbors,paginateNotes,toSummary,assertCatalog} from '../../src/utils/note-model';
test('lecture zero and double-digit neighbors stay in their course',()=>{
 const notes=[10,0,2].map(order=>makeNote({id:`c-lec${order}`,slug:`c-lec${order}`,type:'course',course:{id:'c',order}}));
 notes.push(makeNote({id:'d-lec2',slug:'d-lec2',course:{id:'d',order:2}}),makeNote({id:'hidden',slug:'hidden',course:{id:'c',order:1},visibility:'unlisted'}),makeNote({id:'draft',slug:'draft',course:{id:'c',order:3},visibility:'draft'}));
 assert.deepEqual(orderCourseNotes(notes,'c').map(n=>n.data.course?.order),[0,2,10]);
 const neighbors=getCourseNeighbors(notes,'c-lec2');assert.equal(neighbors.previous?.slug,'c-lec0');assert.equal(neighbors.next?.slug,'c-lec10');
 assert.deepEqual(getCourseNeighbors(notes,'hidden'),{});
 const summaries=Array.from({length:44},(_,i)=>toSummary(makeNote({id:`n${i}`,slug:`n${i}`})));
 assert.equal(paginateNotes(summaries,1).items.length,25);assert.equal(paginateNotes(summaries,2).items.length,19);
 for(const page of [0,3,NaN,1.5])assert.throws(()=>paginateNotes(summaries,page),RangeError);
 assert.deepEqual(paginateNotes([],1),{items:[],totalPages:1});
 assert.throws(()=>assertCatalog([...notes,makeNote({id:'dup',slug:'dup',course:{id:'c',order:2}})],{courses:[{id:'c',title:'c',description:'',sourcePrefix:'c',topic:'robotics'},{id:'d',title:'d',description:'',sourcePrefix:'d',topic:'robotics'}],topics:[{id:'robotics',name:'robotics',description:''}]}),/duplicate course order/);
});
